#!/usr/bin/env python3
"""
wristport Desktop Entry Point (pywebview + local Python SDB bridge)
Launches desktop/bridge.py on 127.0.0.1:8765 and opens the built dist/ SPA
inside a native pywebview window with native Windows file picker helpers.
"""
from __future__ import annotations

import os
import sys
import threading
from pathlib import Path

import webview

from bridge import HOST, PORT, start_bridge_server


def resolve_dist_dir() -> Path:
    if hasattr(sys, "_MEIPASS"):
        meipass_dist = Path(getattr(sys, "_MEIPASS")) / "dist"
        if meipass_dist.is_dir():
            return meipass_dist
    local_dist = Path(__file__).resolve().parent.parent / "dist"
    return local_dist


class JsApi:
    """Native Windows file picker bridge exposed to window.pywebview.api"""

    def __init__(self) -> None:
        self._window: webview.Window | None = None

    def set_window(self, window: webview.Window) -> None:
        self._window = window

    def _open_mode(self) -> int:
        if hasattr(webview, "FileDialog"):
            return webview.FileDialog.OPEN
        return webview.OPEN_DIALOG

    def pick_sdb_exe(self) -> str | None:
        if not self._window:
            return None
        result = self._window.create_file_dialog(
            self._open_mode(),
            allow_multiple=False,
            file_types=("SDB Executable (sdb.exe;sdb)", "All files (*.*)"),
        )
        return result[0] if result else None

    def pick_sdb_zip(self) -> str | None:
        if not self._window:
            return None
        result = self._window.create_file_dialog(
            self._open_mode(),
            allow_multiple=False,
            file_types=("Tizen CLI / SDB Archive (*.zip)", "All files (*.*)"),
        )
        return result[0] if result else None

    def pick_package_file(self) -> str | None:
        if not self._window:
            return None
        result = self._window.create_file_dialog(
            self._open_mode(),
            allow_multiple=False,
            file_types=("Tizen Packages (*.tpk;*.wgt)", "All files (*.*)"),
        )
        return result[0] if result else None


def main() -> None:
    dist_dir = resolve_dist_dir()
    server = start_bridge_server(dist_dir=dist_dir, blocking=False)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    api = JsApi()
    url = f"http://{HOST}:{PORT}/"
    window = webview.create_window(
        "wristport — Tizen Archive & SDB Sideloader",
        url=url,
        width=1360,
        height=860,
        min_size=(1024, 680),
        background_color="#0E1015",
        js_api=api,
    )
    api.set_window(window)
    webview.start(debug=os.environ.get("WRISTPORT_DEBUG") == "1")


if __name__ == "__main__":
    main()
