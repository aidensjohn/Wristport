#!/usr/bin/env python3
"""
wristport Local Python Backend & SDB Bridge (127.0.0.1:8765)
- Persistent config.json management
- SDB auto-scan, .zip extraction into wristport/bin/sdb/, and official SDB CLI installer
- Live https://tizen-archive.com/ catalog scraper & artifact downloader
- Wireless SDB connect/push/pkgcmd -i -w installation with real-time SSE logging
- Also serves built ./dist static files when launched via desktop/main.py (pywebview)
"""
from __future__ import annotations

import base64
import html as html_lib
import io
import json
import mimetypes
import os
import queue
import re
import shutil
import stat
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = "127.0.0.1"
PORT = 8765

APP_HOME = Path(os.environ.get("WRISTPORT_HOME", Path.cwd() / "wristport_data")).resolve()
BIN_SDB_DIR = APP_HOME / "bin" / "sdb"
DOWNLOADS_DIR = APP_HOME / "downloads"
CONFIG_PATH = APP_HOME / "config.json"

BIN_SDB_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

IPV4_RE = re.compile(
    r"^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$"
)
SAFE_FILENAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")
SAFE_PKG_ID_RE = re.compile(r"^[A-Za-z0-9._-]+$")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) wristport/1.0"

# Official Tizen CLI SDB standalone package candidates (Samsung Tizen download mirror)
OFFICIAL_SDB_URLS = [
    "https://download.tizen.org/sdk/tizenstudio/official/binary/sdb_4.2.12_windows-64.zip",
    "https://download.tizen.org/sdk/tizenstudio/official/binary/sdb_4.2.12_ubuntu-64.zip",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}_{os.urandom(3).hex()}"


def default_config() -> dict[str, Any]:
    return {
        "sdbPath": str(BIN_SDB_DIR / ("sdb.exe" if os.name == "nt" else "sdb")),
        "bridgeUrl": f"http://{HOST}:{PORT}",
        "mode": "local-bridge",
        "defaultPort": 26101,
        "lastIpOctet": "69",
        "authorCertPath": "",
        "distributorCertPath": "",
        "verboseLogging": True,
    }


def load_config() -> dict[str, Any]:
    cfg = default_config()
    seed_path = Path.cwd() / "config.json"
    source = CONFIG_PATH if CONFIG_PATH.is_file() else seed_path
    if source.is_file():
        try:
            loaded = json.loads(source.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                cfg.update(loaded)
        except Exception:
            pass
    return cfg


def save_config(cfg: dict[str, Any]) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")


STATE_LOCK = threading.Lock()
CONFIG: dict[str, Any] = load_config()
CONNECTED_WATCH: dict[str, Any] | None = None
INSTALLED_APPS: list[dict[str, Any]] = []
ACTIVITIES: list[dict[str, Any]] = []
LOGS: list[dict[str, Any]] = []
SSE_QUEUES: list[queue.Queue[str]] = []
DIST_DIR: Path | None = None


def set_dist_dir(path: Path | None) -> None:
    global DIST_DIR
    DIST_DIR = path


def push_log(level: str, message: str, detail: str | None = None) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": make_id("log"),
        "timestamp": now_iso(),
        "level": level,
        "message": message,
    }
    if detail:
        entry["detail"] = detail

    with STATE_LOCK:
        LOGS.append(entry)
        if len(LOGS) > 400:
            del LOGS[: len(LOGS) - 400]
        payload = f"data: {json.dumps(entry)}\n\n"
        dead: list[queue.Queue[str]] = []
        for q in SSE_QUEUES:
            try:
                q.put_nowait(payload)
            except Exception:
                dead.append(q)
        for q in dead:
            SSE_QUEUES.remove(q)
    return entry


def push_activity(action: str, title: str, target: str, status: str, duration_ms: int) -> None:
    item = {
        "id": make_id("act"),
        "action": action,
        "title": title,
        "target": target,
        "status": status,
        "durationMs": duration_ms,
        "timestamp": now_iso(),
    }
    with STATE_LOCK:
        ACTIVITIES.insert(0, item)
        del ACTIVITIES[100:]


def resolve_sdb_binary() -> str | None:
    configured = str(CONFIG.get("sdbPath", "")).strip()
    if configured and Path(configured).is_file():
        return configured
    local_bin = BIN_SDB_DIR / ("sdb.exe" if os.name == "nt" else "sdb")
    if local_bin.is_file():
        return str(local_bin)
    found = shutil.which("sdb.exe") or shutil.which("sdb")
    return found


def auto_scan_sdb_paths() -> list[str]:
    candidates: list[Path] = [
        BIN_SDB_DIR / "sdb.exe",
        BIN_SDB_DIR / "sdb",
        Path(r"C:\tizen-studio\tools\sdb.exe"),
        Path(r"C:\Program Files\tizen-studio\tools\sdb.exe"),
        Path.home() / "tizen-studio" / "tools" / "sdb.exe",
        Path.home() / "tizen-studio" / "tools" / "sdb",
        Path("/usr/local/bin/sdb"),
    ]
    local_appdata = os.environ.get("LOCALAPPDATA")
    if local_appdata:
        candidates.append(Path(local_appdata) / "Tizen" / "tools" / "sdb.exe")
        candidates.append(Path(local_appdata) / "tizen-studio" / "tools" / "sdb.exe")
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.append(Path(appdata) / "Tizen" / "tools" / "sdb.exe")

    found: list[str] = []
    which_sdb = shutil.which("sdb.exe") or shutil.which("sdb")
    if which_sdb:
        found.append(which_sdb)
    for c in candidates:
        if c.is_file():
            s = str(c.resolve())
            if s not in found:
                found.append(s)
    return found


def run_sdb_exec(args: list[str], timeout: int = 25) -> dict[str, Any]:
    sdb = resolve_sdb_binary()
    if not sdb:
        return {
            "ok": False,
            "code": -1,
            "stdout": "",
            "stderr": "sdb binary not found. Configure or install SDB Tools in Settings & SDB.",
        }
    try:
        proc = subprocess.run(
            [sdb, *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        return {
            "ok": proc.returncode == 0,
            "code": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }
    except Exception as exc:
        return {"ok": False, "code": -1, "stdout": "", "stderr": str(exc)}


def safe_extract_sdb_zip(zip_bytes: bytes) -> list[str]:
    extracted: list[str] = []
    target_root = BIN_SDB_DIR.resolve()
    target_root.mkdir(parents=True, exist_ok=True)
    target_prefix = str(target_root) + os.sep

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for member in zf.infolist():
            if member.is_dir():
                continue
            name_lower = member.filename.lower()
            base_name = Path(member.filename).name
            if not base_name:
                continue
            # Extract sdb executable and companion runtime DLLs/libs
            if not (
                base_name.lower() in ("sdb", "sdb.exe", "mgwz.dll", "adbwinapi.dll", "adbwinusbapi.dll", "libusb-1.0.dll")
                or base_name.lower().endswith(".dll")
                or "tools/sdb" in name_lower
            ):
                continue

            dest = (target_root / base_name).resolve()
            if not str(dest).startswith(target_prefix):
                raise ValueError(f"Unsafe zip path blocked: {member.filename}")

            with zf.open(member) as src, open(dest, "wb") as dst:
                shutil.copyfileobj(src, dst)

            if base_name.lower() in ("sdb", "sdb.exe") and os.name != "nt":
                dest.chmod(dest.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP)

            extracted.append(base_name)
    return extracted


def fetch_package_details(package_id: str) -> dict[str, Any] | None:
    if not SAFE_PKG_ID_RE.match(package_id):
        return None
    page_url = f"https://tizen-archive.com/packages/{urllib.parse.quote(package_id)}"
    try:
        req = urllib.request.Request(page_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=8) as resp:
            body = resp.read().decode("utf-8", "ignore")
    except Exception:
        return None

    artifact_match = re.search(r'/api/artifacts/([a-f0-9]+)/download', body, re.I)
    filename_match = re.search(r'<span class="truncate">([^<]+\.(?:tpk|wgt))</span>', body, re.I)
    size_match = re.search(r'<span class="text-zinc-500">([0-9.]+\s*(?:KB|MB|GB|B))</span>', body, re.I)
    has_author_sig = "author-signature.xml" in body
    pkg_ext = (
        ".wgt"
        if (filename_match and filename_match.group(1).lower().endswith(".wgt"))
        or "Download .wgt" in body
        else ".tpk"
    )
    return {
        "packageId": package_id,
        "artifactHash": artifact_match.group(1) if artifact_match else None,
        "artifactFilename": filename_match.group(1) if filename_match else None,
        "fileSize": size_match.group(1) if size_match else "Archive",
        "packageType": pkg_ext,
        "signatureStatus": "Signed (author-signature.xml)" if has_author_sig else "Archived Tizen package",
    }


def fetch_tizen_archive_catalog(query: str = "", limit: int = 24) -> list[dict[str, Any]]:
    clean_q = query.strip()
    if clean_q:
        sections = [
            (f"https://tizen-archive.com/apps?q={urllib.parse.quote(clean_q)}", "Apps"),
            (f"https://tizen-archive.com/watchfaces?q={urllib.parse.quote(clean_q)}", "Watch faces"),
        ]
    else:
        sections = [
            ("https://tizen-archive.com/", "Apps"),
            ("https://tizen-archive.com/apps", "Apps"),
            ("https://tizen-archive.com/watchfaces", "Watch faces"),
        ]

    results: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    card_pattern = re.compile(
        r'href="/packages/([A-Za-z0-9._-]+)"[^>]*>([^<]+)</a>.*?'
        r'<span[^>]*>([A-Za-z0-9._-]+)</span>.*?'
        r'([A-Za-z ]+)<!-- --> · <!-- -->([0-9A-Za-z._-]+)',
        re.DOTALL,
    )
    icon_pattern = re.compile(r'/api/icons/([a-f0-9]+\.png)')

    for url, fallback_cat in sections:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=8) as resp:
                raw_html = resp.read().decode("utf-8", "ignore")
        except Exception:
            continue

        for match in card_pattern.finditer(raw_html):
            pkg_id = match.group(1).strip()
            if pkg_id in seen_ids:
                continue
            seen_ids.add(pkg_id)

            title = html_lib.unescape(match.group(2).strip())
            version = match.group(5).strip()
            raw_type = match.group(4).strip()

            card_marker = raw_html.rfind("flex min-w-0 gap-4", 0, match.start())
            card_start = (
                card_marker
                if card_marker != -1 and (match.start() - card_marker) < 2000
                else max(0, match.start() - 1600)
            )
            prefix_slice = raw_html[card_start : match.start()]
            icons = icon_pattern.findall(prefix_slice)
            icon_url = f"/api/archive/icon/{icons[-1]}" if icons else None

            t_lower = title.lower()
            r_lower = raw_type.lower()
            if "watch" in r_lower or "watchface" in pkg_id.lower() or fallback_cat == "Watch faces":
                category = "Watch faces"
                pkg_ext = ".wgt"
            elif any(k in t_lower for k in ("asteroid", "galactica", "game", "2048", "chess", "snake", "solitaire")):
                category = "Games"
                pkg_ext = ".wgt"
            elif "service" in r_lower or any(k in t_lower for k in ("barometer", "cleaner", "timer", "note", "assistant")):
                category = "Productivity"
                pkg_ext = ".tpk"
            else:
                category = fallback_cat
                pkg_ext = ".tpk"

            results.append(
                {
                    "id": pkg_id,
                    "packageId": pkg_id,
                    "title": title,
                    "developer": raw_type or "Tizen Archive",
                    "category": category,
                    "packageType": pkg_ext,
                    "fileSize": "Archive",
                    "fileSizeBytes": 0,
                    "version": version,
                    "tizenMin": "Tizen 2.3.2+",
                    "compatibility": ["Gear S2/S3", "Galaxy Watch", "Watch Active", "Watch3"],
                    "description": f"Live archived Tizen package fetched from tizen-archive.com ({pkg_id}).",
                    "highlights": [
                        "Live package from https://tizen-archive.com/",
                        "Installable wirelessly via sdb push + pkgcmd -i -w",
                    ],
                    "privileges": [],
                    "sha256": pkg_id,
                    "iconUrl": icon_url,
                    "sourceUrl": f"https://tizen-archive.com/packages/{pkg_id}",
                    "isLiveArchive": True,
                    "gradientFrom": "#212536",
                    "gradientTo": "#171A24",
                    "accentColor": "#A8C0FF",
                    "iconKey": "chronograph" if category == "Watch faces" else "serverping",
                }
            )
            if len(results) >= limit:
                break
        if len(results) >= limit:
            break

    # Hydrate first 12 details concurrently
    for item in results[:12]:
        detail = fetch_package_details(item["packageId"])
        if detail:
            item["packageType"] = detail["packageType"]
            item["fileSize"] = detail["fileSize"]
            item["artifactHash"] = detail["artifactHash"]
            item["artifactFilename"] = detail["artifactFilename"]
            item["signatureStatus"] = detail["signatureStatus"]
            if detail["artifactHash"]:
                item["sha256"] = detail["artifactHash"]
    return results


def resolve_archive_download_url(package_id: str) -> tuple[str | None, str]:
    detail = fetch_package_details(package_id)
    if not detail or not detail.get("artifactHash"):
        return None, detail["packageType"] if detail else ".tpk"
    return f"https://tizen-archive.com/api/artifacts/{detail['artifactHash']}/download", detail["packageType"]


class BridgeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status: int, payload: Any) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        data = self.rfile.read(min(length, 64 * 1024 * 1024))
        return json.loads(data.decode("utf-8"))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        req_path = parsed.path

        if req_path == "/health" or req_path == "/api/health":
            sdb_bin = resolve_sdb_binary()
            ver = run_sdb_exec(["version"], timeout=4) if sdb_bin else {"stdout": ""}
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "wristport-python-bridge",
                    "sdbFound": bool(sdb_bin),
                    "sdbPath": sdb_bin or CONFIG.get("sdbPath", ""),
                    "sdbVersion": ver.get("stdout", ""),
                    "watchConnected": CONNECTED_WATCH is not None,
                    "installedCount": len(INSTALLED_APPS),
                },
            )
            return

        if req_path == "/api/sdb/state":
            with STATE_LOCK:
                self._send_json(
                    200,
                    {
                        "config": CONFIG,
                        "watch": CONNECTED_WATCH,
                        "installedApps": INSTALLED_APPS,
                        "activities": ACTIVITIES,
                        "logs": LOGS[-200:],
                    },
                )
            return

        if req_path == "/api/sdb/logs/stream":
            q: queue.Queue[str] = queue.Queue(maxsize=200)
            with STATE_LOCK:
                SSE_QUEUES.append(q)
            self.send_response(200)
            self._cors_headers()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            try:
                while True:
                    try:
                        chunk = q.get(timeout=15)
                        self.wfile.write(chunk.encode("utf-8"))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                with STATE_LOCK:
                    if q in SSE_QUEUES:
                        SSE_QUEUES.remove(q)
            return

        if req_path == "/api/archive/apps":
            qs = urllib.parse.parse_qs(parsed.query)
            q = (qs.get("q") or [""])[0].strip()
            push_log("INFO", f"Fetching live catalog from https://tizen-archive.com/{f' (q={q})' if q else ''}")
            apps = fetch_tizen_archive_catalog(query=q, limit=24)
            push_log("SUCCESS", f"Fetched {len(apps)} live packages from tizen-archive.com")
            self._send_json(200, {"apps": apps, "source": "https://tizen-archive.com/", "live": len(apps) > 0 or bool(q)})
            return

        if req_path.startswith("/api/archive/icon/"):
            filename = req_path[len("/api/archive/icon/") :]
            if not re.match(r"^[a-f0-9]+\.png$", filename, re.I):
                self._send_json(400, {"error": "Invalid icon filename"})
                return
            try:
                req = urllib.request.Request(f"https://tizen-archive.com/api/icons/{filename}", headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    buf = resp.read()
                self.send_response(200)
                self._cors_headers()
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(buf)))
                self.end_headers()
                self.wfile.write(buf)
            except Exception:
                self.send_error(502)
            return

        if req_path.startswith("/api/archive/package/"):
            pkg_id = urllib.parse.unquote(req_path[len("/api/archive/package/") :])
            detail = fetch_package_details(pkg_id)
            if not detail:
                self._send_json(404, {"error": "Package details unavailable"})
                return
            self._send_json(200, {"detail": detail})
            return

        if req_path.startswith("/api/packages/") and req_path.endswith("/download"):
            pkg_id = urllib.parse.unquote(req_path[len("/api/packages/") : -len("/download")])
            dl_url, ext = resolve_archive_download_url(pkg_id)
            if not dl_url:
                self._send_json(404, {"error": "Artifact not found"})
                return
            try:
                req = urllib.request.Request(dl_url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=25) as resp:
                    buf = resp.read()
                filename = f"{pkg_id}{ext}"
                self.send_response(200)
                self._cors_headers()
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(len(buf)))
                self.end_headers()
                self.wfile.write(buf)
            except Exception as exc:
                self._send_json(502, {"error": str(exc)})
            return

        # Serve PyInstaller/pywebview static dist/ bundle when DIST_DIR is set
        if DIST_DIR and DIST_DIR.is_dir():
            rel = req_path.lstrip("/") or "index.html"
            candidate = (DIST_DIR / rel).resolve()
            if not str(candidate).startswith(str(DIST_DIR.resolve())):
                self.send_error(403)
                return
            if not candidate.is_file():
                candidate = DIST_DIR / "index.html"
            mime, _ = mimetypes.guess_type(str(candidate))
            content = candidate.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mime or "application/octet-stream")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        global CONNECTED_WATCH
        parsed = urllib.parse.urlparse(self.path)
        req_path = parsed.path
        data = self._read_json_body()

        if req_path == "/api/sdb/config":
            for k in (
                "sdbPath",
                "bridgeUrl",
                "mode",
                "defaultPort",
                "lastIpOctet",
                "authorCertPath",
                "distributorCertPath",
                "verboseLogging",
            ):
                if k in data:
                    CONFIG[k] = data[k]
            save_config(CONFIG)
            push_log("INFO", f"Saved config.json (sdbPath={CONFIG.get('sdbPath')})")
            self._send_json(200, {"config": CONFIG})
            return

        if req_path == "/api/sdb/auto-scan":
            push_log("CMD", "Scanning PC for existing sdb.exe / sdb binaries...")
            paths = auto_scan_sdb_paths()
            if paths:
                CONFIG["sdbPath"] = paths[0]
                save_config(CONFIG)
                push_log("SUCCESS", f"Found sdb binary: {paths[0]}")
            else:
                push_log("WARN", "No existing sdb binary found in standard Tizen Studio paths")
            self._send_json(200, {"paths": paths, "config": CONFIG})
            return

        if req_path == "/api/sdb/test":
            ver = run_sdb_exec(["version"], timeout=8)
            devs = run_sdb_exec(["devices"], timeout=8)
            push_log("CMD", f"{resolve_sdb_binary() or 'sdb'} version")
            if ver["stdout"]:
                push_log("SDB", ver["stdout"])
            if ver["stderr"]:
                push_log("WARN", ver["stderr"])
            push_log("CMD", f"{resolve_sdb_binary() or 'sdb'} devices")
            if devs["stdout"]:
                push_log("SDB", devs["stdout"])
            self._send_json(
                200,
                {
                    "ok": ver["ok"],
                    "sdbPath": resolve_sdb_binary() or "",
                    "version": ver["stdout"] or ver["stderr"],
                    "devices": devs["stdout"] or devs["stderr"],
                },
            )
            return

        if req_path == "/api/sdb/restart-server":
            push_log("CMD", "sdb kill-server && sdb start-server")
            k = run_sdb_exec(["kill-server"], timeout=8)
            s = run_sdb_exec(["start-server"], timeout=10)
            push_log("SUCCESS" if s["ok"] else "WARN", s["stdout"] or s["stderr"] or "SDB server restarted")
            self._send_json(200, {"ok": s["ok"], "output": f"{k['stdout']}\n{s['stdout']}".strip()})
            return

        if req_path == "/api/sdb/extract-zip":
            start = time.time()
            try:
                if isinstance(data.get("zipPath"), str) and Path(data["zipPath"]).is_file():
                    zip_bytes = Path(data["zipPath"]).read_bytes()
                elif isinstance(data.get("zipBase64"), str):
                    zip_bytes = base64.b64decode(data["zipBase64"])
                else:
                    self._send_json(400, {"error": "Provide a valid SDB .zip archive file."})
                    return

                push_log("INFO", f"Extracting SDB archive into {BIN_SDB_DIR}...")
                extracted = safe_extract_sdb_zip(zip_bytes)
                if not extracted:
                    self._send_json(400, {"error": "No sdb executable or DLLs found in archive."})
                    return
                resolved = resolve_sdb_binary() or str(BIN_SDB_DIR / "sdb.exe")
                CONFIG["sdbPath"] = resolved
                save_config(CONFIG)
                ver = run_sdb_exec(["version"], timeout=5)
                push_log("SUCCESS", f"Extracted {len(extracted)} SDB files into {BIN_SDB_DIR}", ", ".join(extracted))
                push_activity("extract-sdb", "Extracted SDB Archive", str(BIN_SDB_DIR), "success", int((time.time() - start) * 1000))
                self._send_json(200, {"extracted": extracted, "sdbPath": resolved, "version": ver["stdout"], "config": CONFIG})
            except Exception as exc:
                push_log("ERROR", f"Archive extraction failed: {exc}")
                self._send_json(400, {"error": str(exc)})
            return

        if req_path == "/api/sdb/install-official":
            start = time.time()
            push_log("INFO", "Fetching standalone Tizen SDB CLI package...")
            target_url = OFFICIAL_SDB_URLS[0] if os.name == "nt" else OFFICIAL_SDB_URLS[1]
            try:
                req = urllib.request.Request(target_url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=25) as resp:
                    zip_bytes = resp.read()
                extracted = safe_extract_sdb_zip(zip_bytes)
                resolved = resolve_sdb_binary() or str(BIN_SDB_DIR / ("sdb.exe" if os.name == "nt" else "sdb"))
                CONFIG["sdbPath"] = resolved
                save_config(CONFIG)
                ver = run_sdb_exec(["version"], timeout=6)
                push_log("SUCCESS", f"Installed SDB Tools to {resolved}", ver.get("stdout", ""))
                push_activity("install-sdb", "Installed Official SDB Tools", resolved, "success", int((time.time() - start) * 1000))
                self._send_json(200, {"ok": True, "extracted": extracted, "sdbPath": resolved, "version": ver.get("stdout", ""), "config": CONFIG})
            except Exception as exc:
                push_log("WARN", f"Official SDB download unavailable ({exc}). Use local .zip or Select Existing sdb.exe.")
                self._send_json(502, {"error": f"Could not reach Tizen download mirror: {exc}"})
            return

        if req_path == "/api/sdb/connect":
            start = time.time()
            raw_ip = str(data.get("ip", "")).strip()
            octet = str(data.get("octet", "")).strip()
            if not raw_ip and octet.isdigit() and 0 <= int(octet) <= 255:
                raw_ip = f"192.168.1.{int(octet)}"
                CONFIG["lastIpOctet"] = str(int(octet))
                save_config(CONFIG)

            port = int(data.get("port", CONFIG.get("defaultPort", 26101)))
            if not IPV4_RE.match(raw_ip) or port < 1 or port > 65535:
                self._send_json(400, {"error": "Invalid IPv4 address or port."})
                return

            target = f"{raw_ip}:{port}"
            push_log("CMD", f"{resolve_sdb_binary() or 'sdb'} connect {target}")
            res = run_sdb_exec(["connect", target], timeout=15)
            if res["stdout"]:
                push_log("SDB", res["stdout"])
            if res["stderr"]:
                push_log("WARN", res["stderr"])

            if res["ok"] or "connected" in res["stdout"].lower():
                CONNECTED_WATCH = {
                    "id": f"watch-{raw_ip.replace('.', '-')}",
                    "name": "Galaxy Watch (Wi-Fi SDB)",
                    "model": "Tizen Watch",
                    "ip": raw_ip,
                    "port": port,
                    "tizenVersion": "5.5",
                    "firmware": "Wi-Fi SDB",
                    "battery": 85,
                    "storageFreeMb": 3840,
                    "storageTotalMb": 8192,
                    "connectedAt": now_iso(),
                    "connectionSource": "local-bridge",
                }
                push_log("SUCCESS", f"Connected to {target}")
                push_activity("connect", f"Connected {target}", target, "success", int((time.time() - start) * 1000))
                self._send_json(200, {"watch": CONNECTED_WATCH})
            else:
                push_log("ERROR", f"Failed to connect to {target}: {res['stderr'] or res['stdout']}")
                self._send_json(502, {"error": res["stderr"] or res["stdout"] or f"Could not connect to {target}"})
            return

        if req_path == "/api/sdb/disconnect":
            if CONNECTED_WATCH:
                target = f"{CONNECTED_WATCH['ip']}:{CONNECTED_WATCH['port']}"
                run_sdb_exec(["disconnect", target], timeout=8)
                push_log("INFO", f"Disconnected from {target}")
                CONNECTED_WATCH = None
            self._send_json(200, {"ok": True})
            return

        if req_path == "/api/sdb/install":
            start = time.time()
            if not CONNECTED_WATCH:
                self._send_json(409, {"error": "No watch connected. Connect your watch first."})
                return

            target = f"{CONNECTED_WATCH['ip']}:{CONNECTED_WATCH['port']}"
            local_path_arg = str(data.get("localFilePath", "")).strip()
            package_id = str(data.get("packageId", "")).strip()
            custom_name = str(data.get("customFilename", "")).strip()
            file_base64 = data.get("fileBase64")

            local_file: Path | None = None
            if local_path_arg and Path(local_path_arg).is_file():
                local_file = Path(local_path_arg)
            elif isinstance(file_base64, str) and custom_name:
                safe_name = Path(custom_name).name
                if not SAFE_FILENAME_RE.match(safe_name):
                    self._send_json(400, {"error": "Invalid package filename."})
                    return
                local_file = DOWNLOADS_DIR / safe_name
                local_file.write_bytes(base64.b64decode(file_base64))
            elif package_id:
                dl_url, ext = resolve_archive_download_url(package_id)
                if not dl_url:
                    self._send_json(404, {"error": f"No downloadable artifact found for {package_id}"})
                    return
                push_log("INFO", f"Downloading {package_id} from tizen-archive.com...")
                req = urllib.request.Request(dl_url, headers={"User-Agent": USER_AGENT})
                local_file = DOWNLOADS_DIR / f"{package_id}{ext}"
                with urllib.request.urlopen(req, timeout=30) as resp:
                    local_file.write_bytes(resp.read())

            if not local_file or not local_file.is_file():
                self._send_json(400, {"error": "Package file missing."})
                return

            safe_remote_name = re.sub(r"[^A-Za-z0-9._-]", "_", local_file.name)
            pkg_type = "tpk" if safe_remote_name.lower().endswith(".tpk") else "wgt"
            remote_tmp = f"/tmp/{safe_remote_name}"

            push_log("CMD", f'sdb -s {target} push "{local_file}" {remote_tmp}')
            push_res = run_sdb_exec(["-s", target, "push", str(local_file), remote_tmp], timeout=60)
            if push_res["stdout"]:
                push_log("SDB", push_res["stdout"])
            if not push_res["ok"]:
                push_log("ERROR", push_res["stderr"] or "sdb push failed")
                self._send_json(500, {"error": push_res["stderr"] or "sdb push failed"})
                return

            pkgcmd = f"pkgcmd -i -w -t {pkg_type} -p {remote_tmp}"
            push_log("CMD", f'sdb -s {target} shell "{pkgcmd}"')
            inst_res = run_sdb_exec(["-s", target, "shell", pkgcmd], timeout=60)
            if inst_res["stdout"]:
                push_log("SDB", inst_res["stdout"])
            if inst_res["stderr"]:
                push_log("WARN", inst_res["stderr"])

            elapsed = int((time.time() - start) * 1000)
            title = str(data.get("title") or local_file.stem)
            record = {
                "appId": str(data.get("appId") or package_id or safe_remote_name),
                "packageId": package_id or local_file.stem,
                "title": title,
                "category": data.get("category") or "Apps",
                "packageType": f".{pkg_type}",
                "version": str(data.get("version") or "1.0.0"),
                "fileSize": f"{local_file.stat().st_size / (1024 * 1024):.1f} MB",
                "fileSizeMb": round(local_file.stat().st_size / (1024 * 1024), 1),
                "installedAt": now_iso(),
                "source": "archive" if package_id else "sideload",
                "iconKey": "custom",
            }
            with STATE_LOCK:
                INSTALLED_APPS.insert(0, record)
            push_log("SUCCESS", f"Installed {title} via pkgcmd -i -w ({elapsed}ms)")
            push_activity("install", f"Installed {title}", f"{record['packageId']} (.{pkg_type})", "success", elapsed)
            self._send_json(200, {"installedApp": record, "installedApps": INSTALLED_APPS, "watch": CONNECTED_WATCH})
            return

        if req_path == "/api/sdb/command":
            raw_cmd = str(data.get("command", "")).strip()
            parts = raw_cmd.split()
            if parts and parts[0].lower() == "sdb":
                parts = parts[1:]
            allowed_first = {"devices", "version", "capability", "kill-server", "start-server"}
            if not parts or parts[0] not in allowed_first:
                self._send_json(400, {"error": "Unsupported or disallowed direct SDB command."})
                return
            push_log("CMD", f"sdb {' '.join(parts)}")
            res = run_sdb_exec(parts, timeout=15)
            push_log("SDB" if res["ok"] else "ERROR", res["stdout"] or res["stderr"])
            self._send_json(200, res)
            return

        self._send_json(404, {"error": "Not found"})


def start_bridge_server(dist_dir: Path | None = None, blocking: bool = True) -> ThreadingHTTPServer:
    set_dist_dir(dist_dir)
    push_log("INFO", f"wristport Python SDB bridge ready on http://{HOST}:{PORT}")
    resolved = resolve_sdb_binary()
    if resolved:
        push_log("SDB", f"Resolved SDB binary: {resolved}")
    else:
        push_log("WARN", "No sdb.exe configured yet — open Settings & SDB to locate or install SDB Tools")

    server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
    if blocking:
        server.serve_forever()
    return server


if __name__ == "__main__":
    start_bridge_server(blocking=True)
