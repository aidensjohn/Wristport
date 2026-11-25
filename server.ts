import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import JSZip from 'jszip';
import type {
  ActivityRecord,
  AppCategory,
  AppFontId,
  CatppuccinAccent,
  CatppuccinFlavor,
  DiscoveredWatch,
  HeroWatchModel,
  InstalledApp,
  LogLevel,
  Material3Color,
  SdbConfig,
  SdbLogEntry,
  SdbWorkspaceStatus,
  ThemeConfig,
  ThemeFamily,
  ThemeMode,
  TizenApp,
  WatchDevice,
  WatchDiscoveryResult,
  WatchStrapType,
  ZorinMode,
} from './src/types.ts';

const execFileAsync = promisify(execFile);

const IS_STANDALONE = process.env.WRISTPORT_STANDALONE === '1';
const HOST_BASE_DIR = IS_STANDALONE ? path.dirname(process.execPath) : process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production' || IS_STANDALONE;

const USER_HOME = os.homedir();
const APP_HOME = path.resolve(USER_HOME, 'wristport');
const BIN_DIR = path.join(APP_HOME, 'bin');
const DOWNLOADS_DIR = path.join(APP_HOME, 'downloads');
const BACKUPS_DIR = path.join(APP_HOME, 'backups');
const CONFIG_PATH = path.join(APP_HOME, 'config.json');

fs.mkdirSync(BIN_DIR, { recursive: true });
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
fs.mkdirSync(BACKUPS_DIR, { recursive: true });

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const SAFE_PKG_ID_RE = /^[A-Za-z0-9._-]+$/;
const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+$/;
const SAFE_ICON_RE = /^[a-f0-9]+\.png$/i;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) wristport/1.0';

function isValidLocalBridgeUrl(rawUrl: string): boolean {
  if (!rawUrl.trim()) return true;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:') return false;
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function detectLocalSubnets(): string[] {
  const prefixes = new Set<string>();
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('docker') || lowerName.includes('veth')) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('169.254.')) {
        const octets = addr.address.split('.');
        if (octets.length === 4) {
          prefixes.add(`${octets[0]}.${octets[1]}.${octets[2]}`);
        }
      }
    }
  }
  return Array.from(prefixes);
}

const VALID_THEME_FAMILIES = new Set<ThemeFamily>([
  'zorin',
  'liquid-glass',
  'material3',
  'catppuccin',
  'glassmorphism',
  'linear-obsidian',
  'bento-grid',
  'neo-brutalism',
]);
const VALID_THEME_MODES = new Set<ThemeMode>(['dark', 'light']);
const VALID_FONT_IDS = new Set<AppFontId>([
  'default',
  'sf-pro-display',
  'one-ui-sans',
  'oppo-sans',
  'google-sans',
  'inter',
  'space-grotesk',
  'nunito',
  'jetbrains-mono',
  'system',
]);
const VALID_M3_COLORS = new Set<Material3Color>(['indigo', 'emerald', 'rose', 'amber', 'violet']);
const VALID_ZORIN_MODES = new Set<ZorinMode>(['dark', 'light']);
const VALID_CTP_FLAVORS = new Set<CatppuccinFlavor>(['latte', 'frappe', 'macchiato', 'mocha']);
const VALID_CTP_ACCENTS = new Set<CatppuccinAccent>([
  'rosewater',
  'flamingo',
  'pink',
  'mauve',
  'red',
  'maroon',
  'peach',
  'yellow',
  'green',
  'teal',
  'sky',
  'sapphire',
  'blue',
  'lavender',
]);

const VALID_HERO_WATCHES = new Set<HeroWatchModel>([
  'galaxy-watch-1',
  'galaxy-watch-3',
  'gear-s3-classic',
  'gear-s3-frontier',
  'minimal-glass',
]);

const VALID_STRAP_TYPES = new Set<WatchStrapType>([
  'sports',
  'nylon',
  'leather',
  'milanese',
]);

function sanitizeProfileAvatar(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (
    trimmed.length <= 750_000 &&
    /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return fallback;
}

function sanitizeThemeConfig(raw?: Partial<ThemeConfig>, fallback?: ThemeConfig): ThemeConfig {
  const base: ThemeConfig = fallback || {
    family: 'zorin',
    mode: 'dark',
    fontFamily: 'default',
    material3Color: 'indigo',
    zorinMode: 'dark',
    catppuccinFlavor: 'mocha',
    catppuccinAccent: 'mauve',
    heroWatch: 'galaxy-watch-1',
    heroStrap: 'sports',
    profileName: 'Watch enthusiast',
    profileAvatar: '',
  };
  if (!raw || typeof raw !== 'object') return base;
  const cleanName =
    typeof raw.profileName === 'string'
      ? raw.profileName.trim().slice(0, 36) || 'Watch enthusiast'
      : base.profileName;
  return {
    family: raw.family && VALID_THEME_FAMILIES.has(raw.family) ? raw.family : base.family,
    mode: raw.mode && VALID_THEME_MODES.has(raw.mode) ? raw.mode : base.mode,
    fontFamily:
      raw.fontFamily && VALID_FONT_IDS.has(raw.fontFamily) ? raw.fontFamily : base.fontFamily,
    material3Color:
      raw.material3Color && VALID_M3_COLORS.has(raw.material3Color)
        ? raw.material3Color
        : base.material3Color,
    zorinMode:
      raw.zorinMode && VALID_ZORIN_MODES.has(raw.zorinMode) ? raw.zorinMode : base.zorinMode,
    catppuccinFlavor:
      raw.catppuccinFlavor && VALID_CTP_FLAVORS.has(raw.catppuccinFlavor)
        ? raw.catppuccinFlavor
        : base.catppuccinFlavor,
    catppuccinAccent:
      raw.catppuccinAccent && VALID_CTP_ACCENTS.has(raw.catppuccinAccent)
        ? raw.catppuccinAccent
        : base.catppuccinAccent,
    heroWatch:
      raw.heroWatch && VALID_HERO_WATCHES.has(raw.heroWatch)
        ? raw.heroWatch
        : base.heroWatch,
    heroStrap:
      raw.heroStrap && VALID_STRAP_TYPES.has(raw.heroStrap)
        ? raw.heroStrap
        : base.heroStrap,
    profileName: cleanName,
    profileAvatar: sanitizeProfileAvatar(raw.profileAvatar, base.profileAvatar),
  };
}

function loadConfig(): SdbConfig {
  const detected = detectLocalSubnets();
  const base: SdbConfig = {
    sdbPath: '',
    bridgeUrl: 'http://127.0.0.1:8765',
    defaultPort: 26101,
    subnetPrefix: detected[0] || '192.168.1',
    lastIpOctet: '',
    authorCertPath: '',
    distributorCertPath: '',
    verboseLogging: true,
    theme: sanitizeThemeConfig(),
  };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Partial<SdbConfig>;
      return {
        ...base,
        ...parsed,
        theme: sanitizeThemeConfig(parsed.theme, base.theme),
      };
    } catch {
      return base;
    }
  }
  return base;
}

function saveConfig(cfg: SdbConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

let sdbConfig: SdbConfig = loadConfig();
let connectedWatch: WatchDevice | null = null;
let installedApps: InstalledApp[] = [];
let activities: ActivityRecord[] = [];
const logs: SdbLogEntry[] = [];
const sseClients = new Set<Response>();

interface ArchivePackageDetail {
  packageId: string;
  artifactHash?: string;
  artifactFilename?: string;
  fileSize?: string;
  packageType: '.tpk' | '.wgt';
  signatureStatus?: string;
  fetchedAt: number;
}
const packageDetailCache = new Map<string, ArchivePackageDetail>();
let cachedCatalog: { key: string; apps: TizenApp[]; fetchedAt: number } | null = null;
let cachedVersionInfo: { key: string; version: string | null } | null = null;

function pushLog(level: LogLevel, message: string, detail?: string): SdbLogEntry {
  const entry: SdbLogEntry = {
    id: makeId('log'),
    timestamp: nowIso(),
    level,
    message,
    detail,
  };
  logs.push(entry);
  if (logs.length > 400) {
    logs.splice(0, logs.length - 400);
  }
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
  return entry;
}

function pushActivity(record: Omit<ActivityRecord, 'id' | 'timestamp'>): ActivityRecord {
  const item: ActivityRecord = {
    ...record,
    id: makeId('act'),
    timestamp: nowIso(),
  };
  activities = [item, ...activities].slice(0, 100);
  return item;
}

function detectBinaryFormat(
  filePath: string
): SdbWorkspaceStatus['binaryFormat'] {
  if (!fs.existsSync(filePath)) return 'missing';
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    if (bytesRead >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) {
      return 'pe-windows';
    }
    if (bytesRead >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
      return 'elf-linux';
    }
    if (
      bytesRead >= 4 &&
      ((buf[0] === 0xcf && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe) ||
        (buf[0] === 0xfe && buf[1] === 0xed && buf[2] === 0xfa && buf[3] === 0xce))
    ) {
      return 'macho-macos';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function isFormatExecutableOnHost(format: SdbWorkspaceStatus['binaryFormat']): boolean {
  if (process.platform === 'win32') return format === 'pe-windows';
  if (process.platform === 'darwin') return format === 'macho-macos';
  return format === 'elf-linux';
}

function resolveWorkspaceSdbPath(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(BIN_DIR, 'sdb.exe'),
          path.join(HOST_BASE_DIR, 'sdb.exe'),
          path.join(BIN_DIR, 'sdb'),
          path.join(HOST_BASE_DIR, 'sdb'),
        ]
      : [
          path.join(BIN_DIR, 'sdb'),
          path.join(HOST_BASE_DIR, 'sdb'),
          path.join(BIN_DIR, 'sdb.exe'),
          path.join(HOST_BASE_DIR, 'sdb.exe'),
        ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

async function getWorkspaceStatus(forceRefresh = false): Promise<SdbWorkspaceStatus> {
  const stagedFiles = fs.existsSync(BIN_DIR)
    ? fs
        .readdirSync(BIN_DIR, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => d.name)
        .sort()
    : [];
  const binaryPath = resolveWorkspaceSdbPath();
  const hostOs = `${process.platform} (${os.arch()})`;
  const detectedSubnets = detectLocalSubnets();

  if (!binaryPath) {
    return {
      uploaded: false,
      executableOnHost: false,
      binaryName: null,
      binaryPath: null,
      binaryFormat: 'missing',
      binarySizeBytes: 0,
      hostOs,
      sdbVersion: null,
      error: 'Upload your real sdb.exe (or sdb) file into the workspace directory to begin.',
      stagedFiles,
      detectedSubnets,
    };
  }

  const stat = fs.statSync(binaryPath);
  const format = detectBinaryFormat(binaryPath);
  const executableOnHost = isFormatExecutableOnHost(format);
  const key = `${binaryPath}:${stat.size}:${stat.mtimeMs}`;

  if (executableOnHost && (forceRefresh || cachedVersionInfo?.key !== key)) {
    try {
      const { stdout } = await execFileAsync(binaryPath, ['version'], { timeout: 6000 });
      cachedVersionInfo = { key, version: stdout.trim() || null };
    } catch (err) {
      cachedVersionInfo = { key, version: null };
      return {
        uploaded: true,
        executableOnHost: false,
        binaryName: path.basename(binaryPath),
        binaryPath,
        binaryFormat: format,
        binarySizeBytes: stat.size,
        hostOs,
        sdbVersion: null,
        error: `SDB execution error: ${(err as Error).message}`,
        stagedFiles,
        detectedSubnets,
      };
    }
  }

  let error: string | null = null;
  if (!executableOnHost) {
    error =
      format === 'pe-windows' && process.platform !== 'win32'
        ? `Windows sdb.exe (${path.basename(binaryPath)}) is staged in workspace bin/. Run wristport on your Windows PC to connect directly to your Galaxy Watch.`
        : `Uploaded binary (${path.basename(binaryPath)}, ${format}) is not executable on ${hostOs}.`;
  } else if (!cachedVersionInfo?.version) {
    error = 'Uploaded binary did not return a valid SDB version.';
  }

  return {
    uploaded: true,
    executableOnHost: executableOnHost && Boolean(cachedVersionInfo?.version),
    binaryName: path.basename(binaryPath),
    binaryPath,
    binaryFormat: format,
    binarySizeBytes: stat.size,
    hostOs,
    sdbVersion: executableOnHost ? cachedVersionInfo?.version ?? null : null,
    error,
    stagedFiles,
    detectedSubnets,
  };
}

async function execRealSdb(
  args: string[],
  timeoutMs = 20000
): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> {
  const ws = await getWorkspaceStatus();
  if (!ws.uploaded || !ws.binaryPath) {
    throw new Error('No real SDB binary uploaded in workspace bin/. Upload sdb.exe / sdb first.');
  }
  if (!ws.executableOnHost) {
    throw new Error(ws.error || `Uploaded SDB binary (${ws.binaryFormat}) cannot execute on ${ws.hostOs}.`);
  }
  try {
    const { stdout, stderr } = await execFileAsync(ws.binaryPath, args, {
      cwd: path.dirname(ws.binaryPath),
      timeout: timeoutMs,
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return {
      ok: false,
      stdout: (e.stdout || '').trim(),
      stderr: (e.stderr || '').trim(),
      error: e.message,
    };
  }
}

function probeTcpPort(ip: string, port: number, timeoutMs = 240): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const done = (latency: number | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(latency);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(Math.max(1, Date.now() - start)));
    socket.once('timeout', () => done(null));
    socket.once('error', () => done(null));
    socket.connect(port, ip);
  });
}

async function scanSubnetsPort26101(
  port = 26101
): Promise<{ scannedSubnets: string[]; openHosts: Array<{ ip: string; port: number; latencyMs: number }> }> {
  const subnets = detectLocalSubnets().slice(0, 2);
  if (subnets.length === 0) {
    return { scannedSubnets: [], openHosts: [] };
  }

  const ips: string[] = [];
  for (const prefix of subnets) {
    for (let octet = 1; octet <= 254; octet++) {
      ips.push(`${prefix}.${octet}`);
    }
  }

  const openHosts: Array<{ ip: string; port: number; latencyMs: number }> = [];
  const batchSize = 64;
  for (let i = 0; i < ips.length; i += batchSize) {
    const chunk = ips.slice(i, i + batchSize);
    const results = await Promise.all(
      chunk.map(async (ip) => {
        const latencyMs = await probeTcpPort(ip, port, 240);
        return latencyMs !== null ? { ip, port, latencyMs } : null;
      })
    );
    for (const r of results) {
      if (r) openHosts.push(r);
    }
  }
  openHosts.sort((a, b) => a.latencyMs - b.latencyMs);
  return { scannedSubnets: subnets, openHosts };
}

function parseSdbDevices(stdout: string, defaultPort: number): DiscoveredWatch[] {
  const list: DiscoveredWatch[] = [];
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.toLowerCase().startsWith('list of devices') || line.startsWith('*')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const serial = parts[0];
    const state = parts[1];
    if (state !== 'device') continue;
    const [host, maybePort] = serial.split(':');
    const ip = IPV4_REGEX.test(host) ? host : 'USB';
    const port = maybePort && /^\d+$/.test(maybePort) ? Number(maybePort) : defaultPort;
    const label = parts.slice(2).join(' ') || 'Galaxy Watch';
    list.push({
      id: `watch-${serial.replace(/[^A-Za-z0-9]/g, '-')}`,
      serial,
      name: label,
      model: label,
      ip,
      port,
      tizenVersion: 'Detecting...',
      latencyMs: 10,
      source: ip === 'USB' ? 'sdb-devices' : 'port-26101-scan',
    });
  }
  return list;
}

function parseCapabilityMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return map;
}

async function fetchRealWatchInstalledApps(serial: string): Promise<InstalledApp[]> {
  const res = await execRealSdb(['-s', serial, 'shell', 'pkgcmd -l'], 15000);
  if (!res.ok && !res.stdout) return [];

  const typeRe = /pkg_type\s*\[([^\]]+)\]/;
  const idRe = /pkgid\s*\[([^\]]+)\]/;
  const nameRe = /name\s*\[([^\]]+)\]/;
  const verRe = /version\s*\[([^\]]+)\]/;

  const items: InstalledApp[] = [];
  for (const line of res.stdout.split(/\r?\n/)) {
    const pkgId = idRe.exec(line)?.[1]?.trim();
    if (!pkgId) continue;
    const rawType = (typeRe.exec(line)?.[1] || 'tpk').toLowerCase();
    if (rawType !== 'tpk' && rawType !== 'wgt') continue;
    const title = nameRe.exec(line)?.[1]?.trim() || pkgId;
    const version = verRe.exec(line)?.[1]?.trim() || '1.0';
    items.push({
      appId: pkgId,
      packageId: pkgId,
      title,
      category:
        pkgId.toLowerCase().includes('watch') || rawType === 'wgt'
          ? 'Watch faces'
          : 'Utilities & Tools',
      packageType: rawType === 'wgt' ? '.wgt' : '.tpk',
      version,
      fileSize: 'On watch',
      fileSizeMb: 0,
      installedAt: nowIso(),
      source: 'watch',
      iconKey: rawType === 'wgt' ? 'chronograph' : 'serverping',
    });
  }
  return items;
}

async function buildRealWatchDevice(
  serial: string,
  ip: string,
  port: number
): Promise<WatchDevice | null> {
  const capRes = await execRealSdb(['-s', serial, 'capability'], 8000);
  if (!capRes.ok && !capRes.stdout) return null;
  const props = parseCapabilityMap(capRes.stdout);
  const model = props.model_name || serial;
  const tizenVersion = props.platform_version || 'Tizen';
  const arch = props.cpu_arch || props.architecture;

  let storageFreeMb: number | null = null;
  let storageTotalMb: number | null = null;
  const dfRes = await execRealSdb(['-s', serial, 'shell', 'df -k /opt/usr'], 6000);
  const dfLine = dfRes.stdout
    .split(/\r?\n/)
    .reverse()
    .find((l) => l.includes('/') && l.trim().split(/\s+/).length >= 4);
  if (dfLine) {
    const cols = dfLine.trim().split(/\s+/);
    const totalKb = Number(cols[1]);
    const freeKb = Number(cols[3]);
    if (Number.isFinite(totalKb) && Number.isFinite(freeKb)) {
      storageTotalMb = Math.round(totalKb / 1024);
      storageFreeMb = Math.round(freeKb / 1024);
    }
  }

  return {
    id: `watch-${serial.replace(/[^A-Za-z0-9]/g, '-')}`,
    serial,
    name: `Galaxy Watch (${model})`,
    model,
    ip,
    port,
    tizenVersion,
    platformArch: arch,
    firmware: props.build_id || props.firmware_version || `Tizen ${tizenVersion}`,
    storageFreeMb,
    storageTotalMb,
    connectedAt: nowIso(),
    authorizationState: 'device',
    connectionSource: ip === 'USB' ? 'real-sdb-usb' : 'real-sdb-wifi',
  };
}

pushLog('INFO', 'wristport real-SDB server initialized', `workspace=${BIN_DIR}`);

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const GRADIENT_POOL: Array<{ from: string; to: string; accent: string }> = [
  { from: '#23273A', to: '#1A1D2B', accent: '#A8C0FF' },
  { from: '#1C2E2B', to: '#162120', accent: '#6EE7B7' },
  { from: '#33251D', to: '#221A17', accent: '#F5B971' },
  { from: '#252438', to: '#1A1926', accent: '#C4B5FD' },
  { from: '#1E2A3A', to: '#151D28', accent: '#60A5FA' },
  { from: '#30291D', to: '#201B14', accent: '#FBBF24' },
];

function classifyArchiveApp(
  pkgId: string,
  title: string,
  rawType: string,
  fallbackCat: AppCategory
): AppCategory {
  const t = title.toLowerCase();
  const p = pkgId.toLowerCase();
  const r = rawType.toLowerCase();
  if (r.includes('watch') || p.includes('watchface') || fallbackCat === 'Watch faces') {
    return 'Watch faces';
  }
  const gameKeywords = [
    'asteroid',
    'galactica',
    'game',
    '2048',
    'chess',
    'snake',
    'solitaire',
    'puzzle',
    'arcade',
    'runner',
    'flappy',
    'bird',
    'tetris',
    'pacman',
    'pong',
    'dino',
    'shoot',
    'quiz',
    'dice',
    'card',
    'roulette',
    'race',
    'drift',
    'jump',
    'brick',
    'mine',
    'sudoku',
    'tic',
    'space',
    'mario',
    'war',
  ];
  if (gameKeywords.some((kw) => t.includes(kw) || p.includes(kw))) {
    return 'Games';
  }
  const productivityKeywords = [
    'barometer',
    'altimeter',
    'calculator',
    'calc',
    'timer',
    'stopwatch',
    'alarm',
    'calendar',
    'note',
    'memo',
    'recorder',
    'weather',
    'compass',
    'flashlight',
    'torch',
    'translat',
    'currency',
    'converter',
    'unit',
    'checklist',
    'task',
    'todo',
    'habit',
    'pomodoro',
    'reader',
    'scanner',
    'assistant',
    'schedule',
    'reminder',
    'finance',
    'stock',
    'clock',
    'worldtime',
    'fitness',
    'health',
    'step',
    'workout',
    'heart',
    'water',
    'sleep',
  ];
  if (
    r.includes('widget') ||
    r.includes('service') ||
    productivityKeywords.some((kw) => t.includes(kw) || p.includes(kw))
  ) {
    return 'Productivity apps';
  }
  return fallbackCat;
}

async function fetchPackageDetails(packageId: string): Promise<ArchivePackageDetail | null> {
  if (!SAFE_PKG_ID_RE.test(packageId)) return null;
  const cached = packageDetailCache.get(packageId);
  if (cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(`https://tizen-archive.com/packages/${encodeURIComponent(packageId)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();

    const artifactMatch = html.match(/\/api\/artifacts\/([a-f0-9]+)\/download/i);
    const filenameMatch = html.match(/<span class="truncate">([^<]+\.(?:tpk|wgt))<\/span>/i);
    const sizeMatch = html.match(/<span class="text-zinc-500">([0-9.]+\s*(?:KB|MB|GB|B))<\/span>/i);
    const hasAuthorSig = html.includes('author-signature.xml');
    const pkgType: '.tpk' | '.wgt' = filenameMatch?.[1].toLowerCase().endsWith('.wgt')
      ? '.wgt'
      : html.includes('Download .wgt')
      ? '.wgt'
      : '.tpk';

    const detail: ArchivePackageDetail = {
      packageId,
      artifactHash: artifactMatch?.[1],
      artifactFilename: filenameMatch?.[1],
      fileSize: sizeMatch?.[1],
      packageType: pkgType,
      signatureStatus: hasAuthorSig ? 'Signed (author-signature.xml)' : 'Archived Tizen package',
      fetchedAt: Date.now(),
    };
    packageDetailCache.set(packageId, detail);
    return detail;
  } catch {
    return null;
  }
}

async function fetchHtmlPage(url: string, timeoutMs = 10000): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return await res.text();
    } catch {
      // retry once on transient upstream timeout
    }
  }
  return '';
}

function extractMaxPage(html: string): number {
  const matches = [...html.matchAll(/\bof\s+(\d+)\b/gi)];
  let maxPage = 1;
  for (const m of matches) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > maxPage && n <= 80) {
      maxPage = n;
    }
  }
  return maxPage;
}

async function fetchLiveTizenArchive(query = '', forceRefresh = false): Promise<TizenApp[]> {
  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();
  if (
    !forceRefresh &&
    !cleanQuery &&
    cachedCatalog &&
    Date.now() - cachedCatalog.fetchedAt < 15 * 60 * 1000
  ) {
    return cachedCatalog.apps;
  }

  const baseSections: { baseUrl: string; fallbackCat: AppCategory }[] = cleanQuery
    ? [
        {
          baseUrl: `https://tizen-archive.com/apps?q=${encodeURIComponent(cleanQuery)}`,
          fallbackCat: 'Utilities & Tools',
        },
        {
          baseUrl: `https://tizen-archive.com/watchfaces?q=${encodeURIComponent(cleanQuery)}`,
          fallbackCat: 'Watch faces',
        },
      ]
    : [
        { baseUrl: 'https://tizen-archive.com/apps', fallbackCat: 'Utilities & Tools' },
        { baseUrl: 'https://tizen-archive.com/watchfaces', fallbackCat: 'Watch faces' },
      ];

  const pageResults: { html: string; fallbackCat: AppCategory }[] = [];

  // Fetch page 1 of each section to discover total page counts
  const firstPages = await Promise.all(
    baseSections.map(async (sec) => ({
      sec,
      html: await fetchHtmlPage(sec.baseUrl),
    }))
  );

  const remainingJobs: { url: string; fallbackCat: AppCategory }[] = [];
  for (const first of firstPages) {
    if (!first.html) continue;
    pageResults.push({ html: first.html, fallbackCat: first.sec.fallbackCat });
    const maxPage = extractMaxPage(first.html);
    const sep = first.sec.baseUrl.includes('?') ? '&' : '?';
    for (let p = 2; p <= maxPage; p++) {
      remainingJobs.push({
        url: `${first.sec.baseUrl}${sep}page=${p}`,
        fallbackCat: first.sec.fallbackCat,
      });
    }
  }

  // Fetch all remaining pages in bounded parallel batches of 6
  for (let i = 0; i < remainingJobs.length; i += 6) {
    const batch = remainingJobs.slice(i, i + 6);
    const batchHtml = await Promise.all(
      batch.map(async (job) => ({
        html: await fetchHtmlPage(job.url),
        fallbackCat: job.fallbackCat,
      }))
    );
    for (const item of batchHtml) {
      if (item.html) pageResults.push(item);
    }
  }

  const collected: TizenApp[] = [];
  const seen = new Set<string>();
  const cardRe =
    /href="\/packages\/([A-Za-z0-9._-]+)"[^>]*>([^<]+)<\/a>.*?<span[^>]*>([A-Za-z0-9._-]+)<\/span>.*?([A-Za-z ]+)<!-- --> · <!-- -->([0-9A-Za-z._-]+)/gs;
  const iconRe = /\/api\/icons\/([a-f0-9]+\.png)/g;

  for (const page of pageResults) {
    const { html, fallbackCat } = page;
    for (const match of html.matchAll(cardRe)) {
      const pkgId = match[1].trim();
      if (seen.has(pkgId)) continue;
      seen.add(pkgId);

      const title = decodeHtmlEntities(match[2].trim());
      const version = match[5].trim();
      const rawType = match[4].trim();

      const idx = match.index ?? 0;
      const cardMarker = html.lastIndexOf('flex min-w-0 gap-4', idx);
      const cardStart =
        cardMarker !== -1 && idx - cardMarker < 2000 ? cardMarker : Math.max(0, idx - 1600);
      const prefix = html.slice(cardStart, idx);
      const iconMatches = [...prefix.matchAll(iconRe)];
      const iconUrl =
        iconMatches.length > 0
          ? `/api/archive/icon/${encodeURIComponent(iconMatches[iconMatches.length - 1][1])}`
          : null;

      const category = classifyArchiveApp(pkgId, title, rawType, fallbackCat);
      const palette = GRADIENT_POOL[collected.length % GRADIENT_POOL.length];
      const lowerType = rawType.toLowerCase();
      const defaultExt: '.tpk' | '.wgt' =
        lowerType.includes('native') ? '.tpk' : category === 'Watch faces' || lowerType.includes('web') ? '.wgt' : '.tpk';

      collected.push({
        id: pkgId,
        packageId: pkgId,
        title,
        developer: rawType || 'Tizen Archive',
        category,
        packageType: defaultExt,
        fileSize: version ? `v${version}` : 'Archive',
        fileSizeBytes: 0,
        version,
        tizenMin: 'Tizen 2.3.2+',
        compatibility: ['Gear S2/S3', 'Galaxy Watch', 'Watch Active', 'Watch3'],
        description: `Archived Tizen ${rawType.toLowerCase() || 'package'} (${pkgId}) fetched live from tizen-archive.com.`,
        highlights: [
          'Live package from https://tizen-archive.com/',
          'Real binary artifact downloaded from archive',
          'Installed via sdb push + pkgcmd -i -w',
        ],
        privileges: [],
        sha256: pkgId,
        iconUrl,
        sourceUrl: `https://tizen-archive.com/packages/${pkgId}`,
        isLiveArchive: true,
        gradientFrom: palette.from,
        gradientTo: palette.to,
        accentColor: palette.accent,
        iconKey: category === 'Watch faces' ? 'chronograph' : category === 'Games' ? 'orbital2048' : 'serverping',
      });
    }
  }

  if (!cleanQuery && collected.length > 0) {
    cachedCatalog = { key: cacheKey, apps: collected, fetchedAt: Date.now() };
  }
  return collected;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '160mb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    const workspace = await getWorkspaceStatus();
    res.json({
      status: 'ok',
      service: 'wristport-real-sdb',
      workspace,
      watchConnected: Boolean(connectedWatch),
      installedCount: installedApps.length,
    });
  });

  app.get('/api/sdb/workspace', async (_req: Request, res: Response) => {
    res.json(await getWorkspaceStatus(true));
  });

  app.get('/api/sdb/state', async (_req: Request, res: Response) => {
    const workspace = await getWorkspaceStatus();
    res.json({
      config: sdbConfig,
      workspace,
      watch: connectedWatch,
      installedApps,
      activities,
      logs: logs.slice(-200),
    });
  });

  // Upload real sdb.exe, sdb, DLL, or .zip directly into wristport_data/bin/
  app.post('/api/sdb/upload', async (req: Request, res: Response) => {
    const start = Date.now();
    const rawName = String(req.body?.filename ?? '').trim();
    const fileBase64 = typeof req.body?.fileBase64 === 'string' ? req.body.fileBase64 : '';
    const baseName = path.basename(rawName);

    if (!baseName || !SAFE_FILENAME_RE.test(baseName) || !fileBase64) {
      res.status(400).json({ error: 'Provide a valid sdb.exe, sdb binary, DLL, or SDB .zip archive.' });
      return;
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.byteLength < 1024) {
      res.status(400).json({ error: 'Uploaded file is too small to be a valid SDB binary or archive.' });
      return;
    }

    const binRootPrefix = BIN_DIR + path.sep;

    if (baseName.toLowerCase().endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const extracted: string[] = [];
        for (const [entryName, entryObj] of Object.entries(zip.files)) {
          if (entryObj.dir) continue;
          const fileLeaf = path.basename(entryName);
          if (!fileLeaf || !SAFE_FILENAME_RE.test(fileLeaf)) continue;
          const leafLower = fileLeaf.toLowerCase();
          if (
            leafLower !== 'sdb' &&
            leafLower !== 'sdb.exe' &&
            !leafLower.endsWith('.dll') &&
            !entryName.toLowerCase().includes('tools/sdb')
          ) {
            continue;
          }
          const destPath = path.resolve(BIN_DIR, fileLeaf);
          if (!destPath.startsWith(binRootPrefix)) {
            res.status(400).json({ error: 'Blocked unsafe path in archive.' });
            return;
          }
          const content = await entryObj.async('nodebuffer');
          fs.writeFileSync(destPath, content);
          if ((leafLower === 'sdb' || leafLower === 'sdb.exe') && process.platform !== 'win32') {
            fs.chmodSync(destPath, 0o755);
          }
          extracted.push(fileLeaf);
        }

        if (!extracted.some((n) => n.toLowerCase() === 'sdb.exe' || n.toLowerCase() === 'sdb')) {
          res.status(400).json({ error: 'No sdb.exe or sdb executable found inside uploaded archive.' });
          return;
        }
        pushLog('SUCCESS', `Uploaded & extracted SDB files into workspace bin/: ${extracted.join(', ')}`);
      } catch {
        res.status(400).json({ error: 'Invalid ZIP archive.' });
        return;
      }
    } else {
      const lower = baseName.toLowerCase();
      let targetLeaf = baseName;
      if (lower.endsWith('.exe')) {
        targetLeaf = 'sdb.exe';
      } else if (!lower.endsWith('.dll')) {
        targetLeaf = 'sdb';
      }
      const destPath = path.resolve(BIN_DIR, targetLeaf);
      if (!destPath.startsWith(binRootPrefix)) {
        res.status(400).json({ error: 'Blocked unsafe path.' });
        return;
      }
      fs.writeFileSync(destPath, buffer);
      if (!lower.endsWith('.dll') && process.platform !== 'win32') {
        fs.chmodSync(destPath, 0o755);
      }
      pushLog(
        'SUCCESS',
        `Saved real SDB file "${targetLeaf}" (${Math.round(buffer.byteLength / 1024)} KB) into workspace bin/`
      );
    }

    const ws = await getWorkspaceStatus(true);
    if (ws.binaryPath) {
      sdbConfig = { ...sdbConfig, sdbPath: ws.binaryPath };
      saveConfig(sdbConfig);
    }
    if (ws.sdbVersion) {
      pushLog('SDB', ws.sdbVersion);
    } else if (ws.error) {
      pushLog('WARN', ws.error);
    }

    pushActivity({
      action: 'upload-sdb',
      title: `Uploaded ${ws.binaryName || baseName} to workspace`,
      target: ws.binaryPath || BIN_DIR,
      status: ws.uploaded ? 'success' : 'failed',
      durationMs: Date.now() - start,
    });

    res.json({ workspace: ws, config: sdbConfig });
  });

  // Live https://tizen-archive.com/ full catalog + search (zero fake fallback)
  app.get('/api/archive/apps', async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    pushLog(
      'INFO',
      q
        ? `Searching full https://tizen-archive.com/ library for "${q}"...`
        : 'Fetching full Tizen Archive library from https://tizen-archive.com/ ...'
    );
    const liveApps = await fetchLiveTizenArchive(q, refresh);
    if (liveApps.length > 0 || q) {
      pushLog(
        'SUCCESS',
        `Loaded ${liveApps.length} live package${liveApps.length === 1 ? '' : 's'} from tizen-archive.com`
      );
      res.json({ apps: liveApps, source: 'https://tizen-archive.com/', live: true });
      return;
    }
    pushLog('WARN', 'tizen-archive.com returned no packages or is unreachable');
    res.status(502).json({
      apps: [],
      source: 'https://tizen-archive.com/',
      live: false,
      error: 'Unable to reach https://tizen-archive.com/ right now.',
    });
  });

  app.get('/api/archive/icon/:filename', async (req: Request, res: Response) => {
    const filename = String(req.params.filename || '').trim();
    if (!SAFE_ICON_RE.test(filename)) {
      res.status(400).send('Invalid icon filename');
      return;
    }
    try {
      const upstream = await fetch(`https://tizen-archive.com/api/icons/${filename}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });

  app.get('/api/archive/package/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!SAFE_PKG_ID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid package ID' });
      return;
    }
    const detail = await fetchPackageDetails(id);
    if (!detail) {
      res.status(404).json({ error: 'Package details unavailable' });
      return;
    }
    res.json({ detail });
  });

  app.post('/api/sdb/config', (req: Request, res: Response) => {
    const body = req.body as Partial<SdbConfig>;
    if (typeof body.bridgeUrl === 'string' && !isValidLocalBridgeUrl(body.bridgeUrl)) {
      res.status(400).json({
        error: 'Bridge URL must target http://127.0.0.1:<port> or http://localhost:<port>.',
      });
      return;
    }

    const nextPort =
      typeof body.defaultPort === 'number' &&
      Number.isInteger(body.defaultPort) &&
      body.defaultPort >= 1 &&
      body.defaultPort <= 65535
        ? body.defaultPort
        : sdbConfig.defaultPort;

    const nextPrefix =
      typeof body.subnetPrefix === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(body.subnetPrefix.trim())
        ? body.subnetPrefix.trim()
        : sdbConfig.subnetPrefix;

    sdbConfig = {
      sdbPath: resolveWorkspaceSdbPath() || sdbConfig.sdbPath,
      bridgeUrl: typeof body.bridgeUrl === 'string' ? body.bridgeUrl.trim() : sdbConfig.bridgeUrl,
      defaultPort: nextPort,
      subnetPrefix: nextPrefix,
      lastIpOctet:
        typeof body.lastIpOctet === 'string'
          ? body.lastIpOctet.replace(/\D/g, '').slice(0, 3)
          : sdbConfig.lastIpOctet,
      authorCertPath:
        typeof body.authorCertPath === 'string'
          ? body.authorCertPath.trim()
          : sdbConfig.authorCertPath,
      distributorCertPath:
        typeof body.distributorCertPath === 'string'
          ? body.distributorCertPath.trim()
          : sdbConfig.distributorCertPath,
      verboseLogging:
        typeof body.verboseLogging === 'boolean' ? body.verboseLogging : sdbConfig.verboseLogging,
      theme: body.theme ? sanitizeThemeConfig(body.theme, sdbConfig.theme) : sdbConfig.theme,
    };

    saveConfig(sdbConfig);
    pushLog('INFO', 'Saved workspace config.json');
    res.json({ config: sdbConfig });
  });

  app.post('/api/sdb/test', async (_req: Request, res: Response) => {
    const ws = await getWorkspaceStatus(true);
    if (!ws.uploaded) {
      res.status(409).json({ ok: false, error: 'Upload sdb.exe or sdb first.' });
      return;
    }
    if (!ws.executableOnHost) {
      res.status(422).json({
        ok: false,
        sdbPath: ws.binaryPath,
        version: '',
        devices: '',
        error: ws.error,
      });
      return;
    }
    pushLog('CMD', `"${ws.binaryPath}" version`);
    const ver = await execRealSdb(['version'], 8000);
    if (ver.stdout) pushLog('SDB', ver.stdout);
    pushLog('CMD', `"${ws.binaryPath}" devices -l`);
    const devs = await execRealSdb(['devices', '-l'], 8000);
    if (devs.stdout) pushLog('SDB', devs.stdout);

    res.json({
      ok: ver.ok,
      sdbPath: ws.binaryPath,
      version: ver.stdout || ver.stderr,
      devices: devs.stdout || devs.stderr,
    });
  });

  app.post('/api/sdb/restart-server', async (_req: Request, res: Response) => {
    try {
      pushLog('CMD', 'sdb kill-server && sdb start-server');
      await execRealSdb(['kill-server'], 8000);
      const started = await execRealSdb(['start-server'], 10000);
      const output = started.stdout || started.stderr || 'SDB server restarted';
      pushLog(started.ok ? 'SUCCESS' : 'WARN', output);
      res.json({ ok: started.ok, output });
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  app.get('/api/sdb/logs/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.post('/api/sdb/logs/clear', (_req: Request, res: Response) => {
    logs.length = 0;
    pushLog('INFO', 'Console log buffer cleared');
    res.json({ ok: true });
  });

  // Real auto-discovery: runs `sdb devices -l` + TCP port 26101 LAN subnet scan (ZERO fake watches)
  const handleDiscover = async (req: Request, res: Response) => {
    const start = Date.now();
    const rawPort = Number(req.body?.port ?? sdbConfig.defaultPort ?? 26101);
    if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
      res.status(400).json({ error: 'Port must be between 1 and 65535.' });
      return;
    }
    const port = rawPort;
    const ws = await getWorkspaceStatus();

    if (!ws.uploaded || !ws.binaryPath) {
      res.status(409).json({
        error: 'Share/upload your real sdb.exe file into the workspace first.',
      });
      return;
    }

    pushLog('INFO', `Scanning LAN subnets on TCP port ${port} + querying sdb devices...`);
    const lanScan = await scanSubnetsPort26101(port);

    if (!ws.executableOnHost) {
      const reason =
        ws.error ||
        `Uploaded ${ws.binaryName} (${ws.binaryFormat}) cannot execute inside this ${ws.hostOs} container.`;
      pushLog('WARN', reason);
      pushActivity({
        action: 'scan',
        title: `Port ${port} scan completed (${lanScan.openHosts.length} hosts)`,
        target: lanScan.scannedSubnets.map((s) => `${s}.0/24:${port}`).join(', ') || 'No local LAN',
        status: 'failed',
        durationMs: Date.now() - start,
      });
      const result: WatchDiscoveryResult = {
        devices: [],
        connectedWatch: null,
        installedApps: [],
        scannedSubnets: lanScan.scannedSubnets,
        needsManualIp: true,
        reason,
      };
      res.json(result);
      return;
    }

    pushLog('CMD', `"${ws.binaryPath}" start-server && "${ws.binaryPath}" devices -l`);
    await execRealSdb(['start-server'], 10000);
    const initial = await execRealSdb(['devices', '-l'], 10000);
    if (initial.stdout) pushLog('SDB', initial.stdout);

    for (const host of lanScan.openHosts) {
      const target = `${host.ip}:${port}`;
      pushLog('CMD', `"${ws.binaryPath}" connect ${target}`, `${host.latencyMs}ms TCP open`);
      const conn = await execRealSdb(['connect', target], 8000);
      if (conn.stdout) pushLog('SDB', conn.stdout);
    }

    const refreshed = await execRealSdb(['devices', '-l'], 10000);
    const parsed = parseSdbDevices(refreshed.stdout, port);
    const discovered: DiscoveredWatch[] = [];
    for (const dev of parsed) {
      const cap = await execRealSdb(['-s', dev.serial, 'capability'], 6000);
      const props = parseCapabilityMap(cap.stdout);
      const model = props.model_name || dev.model;
      const lat = lanScan.openHosts.find((h) => h.ip === dev.ip)?.latencyMs ?? 10;
      discovered.push({
        ...dev,
        name: model ? `Galaxy Watch (${model})` : dev.name,
        model,
        tizenVersion: props.platform_version || 'Tizen',
        latencyMs: lat,
      });
    }

    if (discovered.length > 0) {
      const primary = discovered[0];
      connectedWatch = await buildRealWatchDevice(primary.serial, primary.ip, primary.port);
      if (connectedWatch) {
        installedApps = await fetchRealWatchInstalledApps(connectedWatch.serial);
        pushLog(
          'SUCCESS',
          `Connected to real watch ${connectedWatch.model} (${connectedWatch.serial})`,
          `Tizen ${connectedWatch.tizenVersion} · ${installedApps.length} watch packages`
        );
      }
      pushActivity({
        action: 'scan',
        title: `Discovered ${discovered.length} real watch(es)`,
        target: `${primary.ip}:${primary.port}`,
        status: 'success',
        durationMs: Date.now() - start,
      });
      res.json({
        devices: discovered,
        connectedWatch,
        installedApps,
        scannedSubnets: lanScan.scannedSubnets,
        needsManualIp: false,
      } satisfies WatchDiscoveryResult);
      return;
    }

    pushLog('WARN', `0 watches found via sdb devices or TCP port ${port} scan.`);
    pushActivity({
      action: 'scan',
      title: `Auto-discovery found 0 watches on port ${port}`,
      target: lanScan.scannedSubnets.map((s) => `${s}.0/24`).join(', ') || 'No LAN match',
      status: 'failed',
      durationMs: Date.now() - start,
    });
    res.json({
      devices: [],
      connectedWatch: null,
      installedApps: [],
      scannedSubnets: lanScan.scannedSubnets,
      needsManualIp: true,
      reason: `No watches found automatically on port ${port}. Enter the last digits of your watch IP.`,
    } satisfies WatchDiscoveryResult);
  };

  app.post('/api/sdb/discover', handleDiscover);
  app.post('/api/sdb/scan', handleDiscover);

  app.post('/api/sdb/connect', async (req: Request, res: Response) => {
    const start = Date.now();
    let rawIp = String(req.body?.ip ?? '').trim();
    const octet = String(req.body?.octet ?? '').trim();
    const subnetPrefix =
      typeof req.body?.subnetPrefix === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(req.body.subnetPrefix.trim())
        ? req.body.subnetPrefix.trim()
        : sdbConfig.subnetPrefix || '192.168.1';

    if (!rawIp && /^\d{1,3}$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255) {
      rawIp = `${subnetPrefix}.${Number(octet)}`;
      sdbConfig = { ...sdbConfig, subnetPrefix, lastIpOctet: String(Number(octet)) };
      saveConfig(sdbConfig);
    }

    const port = Number(req.body?.port ?? sdbConfig.defaultPort ?? 26101);
    if (!IPV4_REGEX.test(rawIp)) {
      res.status(400).json({ error: 'Enter the last 2–3 digits (0–255) of your watch IP or a valid IPv4.' });
      return;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      res.status(400).json({ error: 'Port must be between 1 and 65535.' });
      return;
    }

    const ws = await getWorkspaceStatus();
    if (!ws.uploaded) {
      res.status(409).json({ error: 'Upload your real sdb.exe / sdb file first.' });
      return;
    }
    if (!ws.executableOnHost) {
      res.status(422).json({
        error:
          ws.error ||
          'Windows sdb.exe is staged in workspace, but cannot run inside this Linux host. Run wristport on your Windows PC to connect your watch.',
      });
      return;
    }

    const target = `${rawIp}:${port}`;
    pushLog('CMD', `"${ws.binaryPath}" connect ${target}`);
    const connRes = await execRealSdb(['connect', target], 15000);
    if (connRes.stdout) pushLog('SDB', connRes.stdout);
    if (connRes.stderr) pushLog('WARN', connRes.stderr);

    const outLower = `${connRes.stdout}\n${connRes.stderr}`.toLowerCase();
    if (!connRes.ok && !outLower.includes('connected')) {
      const msg = connRes.stderr || connRes.stdout || connRes.error || `Failed to connect to ${target}`;
      pushLog('ERROR', msg);
      pushActivity({
        action: 'connect',
        title: 'Watch connect failed',
        target,
        status: 'failed',
        durationMs: Date.now() - start,
      });
      res.status(502).json({ error: msg });
      return;
    }

    const devList = await execRealSdb(['devices', '-l'], 8000);
    const matchingLine = devList.stdout.split(/\r?\n/).find((l) => l.includes(rawIp)) || '';
    if (matchingLine.includes('unauthorized')) {
      res.status(409).json({
        error: `Watch at ${target} is unauthorized — tap "Always allow" on the RSA prompt on your Galaxy Watch and click OK again.`,
      });
      return;
    }
    if (matchingLine.includes('offline')) {
      res.status(502).json({
        error: `Watch at ${target} reported offline. Check Wi-Fi Always On and Debug over Wi-Fi.`,
      });
      return;
    }

    const device = await buildRealWatchDevice(target, rawIp, port);
    if (!device) {
      res.status(502).json({
        error: `Connected to ${target}, but watch did not answer sdb capability.`,
      });
      return;
    }

    connectedWatch = device;
    installedApps = await fetchRealWatchInstalledApps(device.serial);
    pushLog('SUCCESS', `Connected to real watch ${device.model} (${target})`, `Tizen ${device.tizenVersion}`);
    pushActivity({
      action: 'connect',
      title: `Connected ${device.model}`,
      target,
      status: 'success',
      durationMs: Date.now() - start,
    });

    res.json({ watch: connectedWatch, installedApps });
  });

  app.post('/api/sdb/disconnect', async (_req: Request, res: Response) => {
    if (!connectedWatch) {
      res.json({ ok: true });
      return;
    }
    const target = connectedWatch.serial;
    const name = connectedWatch.name;
    try {
      await execRealSdb(['disconnect', target], 8000);
    } catch {
      // Ignore if binary unavailable
    }
    connectedWatch = null;
    installedApps = [];
    pushLog('INFO', `Disconnected from ${name} (${target})`);
    pushActivity({
      action: 'disconnect',
      title: `Disconnected ${name}`,
      target,
      status: 'success',
      durationMs: 40,
    });
    res.json({ ok: true });
  });

  app.post('/api/sdb/installed/refresh', async (_req: Request, res: Response) => {
    if (!connectedWatch) {
      res.json({ installedApps: [] });
      return;
    }
    try {
      installedApps = await fetchRealWatchInstalledApps(connectedWatch.serial);
      res.json({ installedApps });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Real download + real `sdb push` + real `pkgcmd -i -w` (ZERO fake install simulation)
  app.post('/api/sdb/install', async (req: Request, res: Response) => {
    const start = Date.now();
    const ws = await getWorkspaceStatus();
    if (!ws.uploaded || !ws.binaryPath) {
      res.status(409).json({ error: 'Upload your real sdb.exe / sdb binary before downloading or installing.' });
      return;
    }
    if (!ws.executableOnHost) {
      res.status(422).json({ error: ws.error || 'Uploaded SDB binary cannot execute on this host OS.' });
      return;
    }
    if (!connectedWatch) {
      pushLog('ERROR', 'Install aborted: no real Galaxy Watch connected via SDB');
      res.status(409).json({ error: 'No real watch connected. Connect your watch via SDB first.' });
      return;
    }

    const appId = typeof req.body?.appId === 'string' ? req.body.appId.trim() : '';
    const reqPkgId = typeof req.body?.packageId === 'string' ? req.body.packageId.trim() : '';
    const reqTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const customFilename = typeof req.body?.customFilename === 'string' ? req.body.customFilename.trim() : '';
    const fileBase64 = typeof req.body?.fileBase64 === 'string' ? req.body.fileBase64 : '';
    const uninstallFirst = Boolean(req.body?.uninstallFirst);

    let localPkgPath = '';
    const dlRootPrefix = DOWNLOADS_DIR + path.sep;

    if (fileBase64 && customFilename) {
      const safeLeaf = path.basename(customFilename).replace(/[^A-Za-z0-9._-]/g, '_');
      if (!SAFE_FILENAME_RE.test(safeLeaf)) {
        res.status(400).json({ error: 'Invalid package filename.' });
        return;
      }
      localPkgPath = path.resolve(DOWNLOADS_DIR, safeLeaf);
      if (!localPkgPath.startsWith(dlRootPrefix)) {
        res.status(400).json({ error: 'Unsafe destination path.' });
        return;
      }
      fs.writeFileSync(localPkgPath, Buffer.from(fileBase64, 'base64'));
    } else {
      const lookupId = reqPkgId || appId;
      if (!SAFE_PKG_ID_RE.test(lookupId)) {
        res.status(400).json({ error: 'Invalid package ID.' });
        return;
      }
      const detail = await fetchPackageDetails(lookupId);
      if (!detail?.artifactHash) {
        res.status(404).json({ error: `No downloadable .tpk/.wgt artifact found on tizen-archive.com for ${lookupId}.` });
        return;
      }
      const fileLeaf = (detail.artifactFilename || `${lookupId}${detail.packageType}`).replace(
        /[^A-Za-z0-9._-]/g,
        '_'
      );
      localPkgPath = path.resolve(DOWNLOADS_DIR, fileLeaf);
      if (!localPkgPath.startsWith(dlRootPrefix)) {
        res.status(400).json({ error: 'Unsafe destination path.' });
        return;
      }
      pushLog('INFO', `Downloading ${fileLeaf} from https://tizen-archive.com/...`);
      const dlRes = await fetch(
        `https://tizen-archive.com/api/artifacts/${detail.artifactHash}/download`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (!dlRes.ok) {
        res.status(502).json({ error: `Failed to download package from archive (HTTP ${dlRes.status}).` });
        return;
      }
      const buf = Buffer.from(await dlRes.arrayBuffer());
      fs.writeFileSync(localPkgPath, buf);
      pushLog('SUCCESS', `Downloaded ${fileLeaf} (${Math.round(buf.byteLength / 1024)} KB)`);
    }

    const remoteLeaf = path.basename(localPkgPath).replace(/[^A-Za-z0-9._-]/g, '_');
    const pkgFlag = remoteLeaf.toLowerCase().endsWith('.tpk') ? 'tpk' : 'wgt';
    const remoteTmp = `/tmp/${remoteLeaf}`;
    const target = connectedWatch.serial;

    // Delete existing app version before installing update so SDB does not reject existing packages
    if (uninstallFirst) {
      const unPkgId = reqPkgId || appId;
      if (SAFE_PKG_ID_RE.test(unPkgId)) {
        const existingItem = installedApps.find(
          (item) => item.packageId.toLowerCase() === unPkgId.toLowerCase()
        );
        const existingFlag = existingItem?.packageType === '.wgt'
          ? 'wgt'
          : existingItem?.packageType === '.tpk'
          ? 'tpk'
          : pkgFlag;
        const uninstallCmd = `pkgcmd -u -t ${existingFlag} -n ${unPkgId} -q`;
        pushLog(
          'WARN',
          `Uninstalling existing ${reqTitle || unPkgId} (${unPkgId}) before update — existing app data will be erased`
        );
        pushLog('CMD', `"${ws.binaryPath}" -s ${target} shell "${uninstallCmd}"`);
        let unRes = await execRealSdb(['-s', target, 'shell', uninstallCmd], 60000);
        if (unRes.stdout) pushLog('SDB', unRes.stdout);
        if (unRes.stderr) pushLog('WARN', unRes.stderr);

        // Retry with alternate type flag if the first type didn't match what was installed
        if (!unRes.ok || /val\[uninstall\]\s*failed/i.test(`${unRes.stdout}\n${unRes.stderr}`)) {
          const altFlag = existingFlag === 'tpk' ? 'wgt' : 'tpk';
          const altCmd = `pkgcmd -u -t ${altFlag} -n ${unPkgId} -q`;
          pushLog('CMD', `"${ws.binaryPath}" -s ${target} shell "${altCmd}"`);
          unRes = await execRealSdb(['-s', target, 'shell', altCmd], 60000);
          if (unRes.stdout) pushLog('SDB', unRes.stdout);
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    pushLog('CMD', `"${ws.binaryPath}" -s ${target} push "${localPkgPath}" ${remoteTmp}`);
    const pushRes = await execRealSdb(['-s', target, 'push', localPkgPath, remoteTmp], 120000);
    if (pushRes.stdout) pushLog('SDB', pushRes.stdout);
    if (!pushRes.ok) {
      const err = pushRes.stderr || pushRes.stdout || pushRes.error || 'sdb push failed';
      pushLog('ERROR', err);
      pushActivity({
        action: uninstallFirst ? 'update' : 'install',
        title: `${uninstallFirst ? 'Update push' : 'Push'} failed: ${reqTitle || remoteLeaf}`,
        target,
        status: 'failed',
        durationMs: Date.now() - start,
      });
      res.status(500).json({ error: err });
      return;
    }

    const pkgcmd = `pkgcmd -i -w -t ${pkgFlag} -p ${remoteTmp}`;
    pushLog('CMD', `"${ws.binaryPath}" -s ${target} shell "${pkgcmd}"`);
    const instRes = await execRealSdb(['-s', target, 'shell', pkgcmd], 120000);
    if (instRes.stdout) pushLog('SDB', instRes.stdout);
    if (instRes.stderr) pushLog('WARN', instRes.stderr);

    const combinedOut = `${instRes.stdout}\n${instRes.stderr}`;
    if (!instRes.ok || /val\[install\]\s*failed/i.test(combinedOut)) {
      const err = instRes.stderr || instRes.stdout || instRes.error || 'pkgcmd install failed';
      pushLog('ERROR', err);
      res.status(500).json({ error: err });
      return;
    }

    const elapsed = Date.now() - start;
    pushLog(
      'SUCCESS',
      `${uninstallFirst ? 'Updated' : 'Installed'} ${reqTitle || remoteLeaf} via real pkgcmd -i -w (${elapsed}ms)`
    );
    connectedWatch = (await buildRealWatchDevice(target, connectedWatch.ip, connectedWatch.port)) || connectedWatch;
    installedApps = await fetchRealWatchInstalledApps(target);

    const installedRecord: InstalledApp =
      installedApps.find((a) => a.packageId === (reqPkgId || appId)) || {
        appId: reqPkgId || appId || remoteLeaf,
        packageId: reqPkgId || appId || remoteLeaf,
        title: reqTitle || path.basename(remoteLeaf, path.extname(remoteLeaf)),
        category: pkgFlag === 'wgt' ? 'Watch faces' : 'Utilities & Tools',
        packageType: pkgFlag === 'tpk' ? '.tpk' : '.wgt',
        version: 'installed',
        fileSize: `${Math.round(fs.statSync(localPkgPath).size / 1024)} KB`,
        fileSizeMb: Number((fs.statSync(localPkgPath).size / (1024 * 1024)).toFixed(2)),
        installedAt: nowIso(),
        source: reqPkgId || appId ? 'archive' : 'sideload',
        iconKey: pkgFlag === 'wgt' ? 'chronograph' : 'serverping',
      };

    pushActivity({
      action: uninstallFirst ? 'update' : 'install',
      title: `${uninstallFirst ? 'Updated' : 'Installed'} ${installedRecord.title}`,
      target: `${installedRecord.packageId} (.${pkgFlag})`,
      status: 'success',
      durationMs: elapsed,
    });

    res.json({ installedApp: installedRecord, installedApps, watch: connectedWatch });
  });

  app.post('/api/sdb/uninstall', async (req: Request, res: Response) => {
    const start = Date.now();
    const packageId = String(req.body?.packageId ?? '').trim();
    if (!SAFE_PKG_ID_RE.test(packageId)) {
      res.status(400).json({ error: 'Invalid package ID.' });
      return;
    }
    if (!connectedWatch) {
      res.status(409).json({ error: 'No watch connected.' });
      return;
    }
    const existing = installedApps.find((item) => item.packageId === packageId);
    const pkgFlag = existing?.packageType === '.wgt' ? 'wgt' : 'tpk';
    const cmd = `pkgcmd -u -t ${pkgFlag} -n ${packageId} -q`;
    pushLog('CMD', `sdb -s ${connectedWatch.serial} shell "${cmd}"`);
    const unRes = await execRealSdb(['-s', connectedWatch.serial, 'shell', cmd], 60000);
    if (unRes.stdout) pushLog('SDB', unRes.stdout);
    if (!unRes.ok) {
      res.status(500).json({ error: unRes.stderr || unRes.stdout || 'Uninstall failed.' });
      return;
    }
    const elapsed = Date.now() - start;
    installedApps = await fetchRealWatchInstalledApps(connectedWatch.serial);
    pushLog('SUCCESS', `Uninstalled ${packageId}`, `${elapsed}ms`);
    pushActivity({
      action: 'uninstall',
      title: `Uninstalled ${existing?.title || packageId}`,
      target: packageId,
      status: 'success',
      durationMs: elapsed,
    });
    res.json({ installedApps, watch: connectedWatch });
  });

  app.post('/api/sdb/backup', async (_req: Request, res: Response) => {
    const start = Date.now();
    if (!connectedWatch) {
      res.status(409).json({ error: 'No watch connected. Connect your Galaxy Watch first.' });
      return;
    }

    const ws = await getWorkspaceStatus();
    if (!ws.uploaded || !ws.executableOnHost || !ws.binaryPath) {
      res.status(409).json({
        error: ws.error || 'Executable SDB binary is required to back up your watch.',
      });
      return;
    }

    const target = connectedWatch.serial;
    const safeModel = connectedWatch.model.replace(/[^A-Za-z0-9._-]/g, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipFilename = `wristport-watch-backup-${safeModel}-${stamp}.zip`;
    const tempStageDir = path.join(BACKUPS_DIR, `tmp_${Date.now()}`);
    fs.mkdirSync(tempStageDir, { recursive: true });

    try {
      pushLog('INFO', `Starting watch backup for ${connectedWatch.name} (${target})...`);

      const [capRes, pkgRes, dfRes] = await Promise.all([
        execRealSdb(['-s', target, 'capability'], 10000),
        execRealSdb(['-s', target, 'shell', 'pkgcmd -l'], 15000),
        execRealSdb(['-s', target, 'shell', 'df -k /opt/usr'], 8000),
      ]);

      const currentApps = await fetchRealWatchInstalledApps(target);
      if (currentApps.length > 0) {
        installedApps = currentApps;
      }

      const zip = new JSZip();
      zip.file(
        'watch-device-info.json',
        JSON.stringify(
          {
            backedUpAt: nowIso(),
            watch: connectedWatch,
            installedCount: installedApps.length,
          },
          null,
          2
        )
      );
      zip.file('watch-capability.txt', capRes.stdout || '(unavailable)');
      zip.file('pkgcmd-list.txt', pkgRes.stdout || '(unavailable)');
      zip.file('installed-packages.json', JSON.stringify(installedApps, null, 2));
      zip.file('storage-df.txt', dfRes.stdout || '(unavailable)');

      const remotePullDirs = [
        { remote: '/opt/usr/home/owner/media', folder: 'watch-files/media' },
        { remote: '/opt/usr/home/owner/downloads', folder: 'watch-files/downloads' },
        { remote: '/opt/usr/home/owner/data', folder: 'watch-files/data' },
      ];

      const pullSummary: Array<{ remote: string; filesPulled: number; note: string }> = [];
      let totalPulledFiles = 0;

      const collectPulledFiles = (dir: string, zipBase: string): number => {
        if (!fs.existsSync(dir)) return 0;
        let count = 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          const zipTarget = `${zipBase}/${entry.name}`;
          if (entry.isDirectory()) {
            count += collectPulledFiles(full, zipTarget);
          } else if (entry.isFile()) {
            try {
              zip.file(zipTarget, fs.readFileSync(full));
              count++;
            } catch {
              // ignore unreadable file
            }
          }
        }
        return count;
      };

      for (const item of remotePullDirs) {
        const localSubdir = path.join(tempStageDir, item.folder);
        fs.mkdirSync(localSubdir, { recursive: true });
        pushLog('CMD', `"${ws.binaryPath}" -s ${target} pull "${item.remote}" "${localSubdir}"`);
        const pullRes = await execRealSdb(
          ['-s', target, 'pull', item.remote, localSubdir],
          45000
        );
        const fileCount = collectPulledFiles(localSubdir, item.folder);
        totalPulledFiles += fileCount;
        pullSummary.push({
          remote: item.remote,
          filesPulled: fileCount,
          note: pullRes.ok
            ? 'Pulled via sdb pull'
            : pullRes.stderr || pullRes.stdout || 'Skipped or empty on watch',
        });
      }

      zip.file(
        'backup-report.json',
        JSON.stringify(
          {
            watch: connectedWatch.serial,
            createdAt: nowIso(),
            pulledFileCount: totalPulledFiles,
            installedPackagesCount: installedApps.length,
            directories: pullSummary,
          },
          null,
          2
        )
      );

      const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      const savedPath = path.join(BACKUPS_DIR, zipFilename);
      fs.writeFileSync(savedPath, zipBuf);

      const elapsed = Date.now() - start;
      pushLog(
        'SUCCESS',
        `Watch backup completed: ${zipFilename}`,
        `${Math.round(zipBuf.byteLength / 1024)} KB · ${totalPulledFiles} watch files + ${installedApps.length} packages`
      );
      pushActivity({
        action: 'backup',
        title: `Backed up ${connectedWatch.name}`,
        target: `${zipFilename} (${totalPulledFiles} files, ${installedApps.length} apps)`,
        status: 'success',
        durationMs: elapsed,
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
      res.setHeader('X-Backup-Files', String(totalPulledFiles));
      res.setHeader('X-Backup-Packages', String(installedApps.length));
      res.setHeader('X-Backup-Filename', zipFilename);
      res.send(zipBuf);
    } catch (err) {
      const msg = (err as Error).message || 'Watch backup failed.';
      pushLog('ERROR', msg);
      pushActivity({
        action: 'backup',
        title: `Backup failed for ${connectedWatch.name}`,
        target,
        status: 'failed',
        durationMs: Date.now() - start,
      });
      res.status(500).json({ error: msg });
    } finally {
      fs.rmSync(tempStageDir, { recursive: true, force: true });
    }
  });

  app.post('/api/sdb/command', async (req: Request, res: Response) => {
    const rawCmd = String(req.body?.command ?? '').trim();
    if (!rawCmd) {
      res.status(400).json({ error: 'Empty command' });
      return;
    }
    let parts = rawCmd.split(/\s+/).filter(Boolean);
    if (parts[0]?.toLowerCase() === 'sdb') {
      parts = parts.slice(1);
    }
    const allowed = new Set(['devices', 'version', 'capability', 'kill-server', 'start-server', 'shell']);
    if (parts.length === 0 || !allowed.has(parts[0].toLowerCase())) {
      res.status(400).json({
        error: 'Command must start with: devices, version, capability, kill-server, start-server, or shell',
      });
      return;
    }
    try {
      pushLog('CMD', `sdb ${parts.join(' ')}`);
      const result = await execRealSdb(parts, 15000);
      if (result.stdout) pushLog('SDB', result.stdout);
      if (result.stderr) pushLog('WARN', result.stderr);
      if (result.error) pushLog('ERROR', result.error);
      res.json(result);
    } catch (err) {
      const msg = (err as Error).message;
      pushLog('ERROR', msg);
      res.status(409).json({ ok: false, error: msg });
    }
  });

  // Download REAL .tpk/.wgt binary from tizen-archive.com (require real SDB uploaded first)
  app.get('/api/packages/:id/download', async (req: Request, res: Response) => {
    const ws = await getWorkspaceStatus();
    if (!ws.uploaded) {
      res.status(409).json({ error: 'Upload your real sdb.exe / sdb file into workspace bin/ before downloading.' });
      return;
    }

    const pkgId = String(req.params.id || '').trim();
    if (!SAFE_PKG_ID_RE.test(pkgId)) {
      res.status(400).json({ error: 'Invalid package ID' });
      return;
    }

    const detail = await fetchPackageDetails(pkgId);
    if (!detail?.artifactHash) {
      res.status(404).json({ error: 'Real artifact not found for this package ID.' });
      return;
    }

    const upstream = await fetch(
      `https://tizen-archive.com/api/artifacts/${detail.artifactHash}/download`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Archive download failed (HTTP ${upstream.status}).` });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const filename = (detail.artifactFilename || `${pkgId}${detail.packageType}`).replace(
      /[^A-Za-z0-9._-]/g,
      '_'
    );
    pushLog('SUCCESS', `Downloaded real archive package ${filename} (${detail.fileSize || 'Archive'})`);
    pushActivity({
      action: 'download',
      title: `Downloaded ${filename}`,
      target: filename,
      status: 'success',
      durationMs: 180,
    });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  // Bundle self-contained Kotlin JVM + Java desktop project + pre-built UI + any staged sdb.exe
  const addDirToZip = (zip: JSZip, sourceDir: string, zipFolder: string, excludeExts = false) => {
    if (!fs.existsSync(sourceDir)) return;
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      const fullPath = path.join(sourceDir, entry.name);
      const targetPath = zipFolder ? `${zipFolder}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.gradle' ||
          entry.name === '.gradle-tool' ||
          entry.name === 'build' ||
          entry.name === 'aistudio'
        ) {
          continue;
        }
        addDirToZip(zip, fullPath, targetPath, excludeExts);
      } else if (entry.isFile()) {
        if (excludeExts && entry.name.toLowerCase().endsWith('.exe')) continue;
        zip.file(targetPath, fs.readFileSync(fullPath));
      }
    }
  };

  app.post('/api/export/kotlin-kit', async (_req: Request, res: Response) => {
    const start = Date.now();
    const rootDir = process.cwd();
    const distDir = path.resolve(rootDir, 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      pushLog('INFO', 'Building Vite dist/ frontend assets for Kotlin JVM bundle...');
      const { build: viteBuild } = await import('vite');
      await viteBuild({ root: rootDir, logLevel: 'silent' });
    }

    const zip = new JSZip();
    addDirToZip(zip, path.resolve(rootDir, 'kotlin-app'), '');
    addDirToZip(zip, distDir, 'dist', true);

    // Carry over any uploaded real sdb.exe / sdb / DLLs directly into wristport_data/bin/ inside the kit!
    if (fs.existsSync(BIN_DIR)) {
      addDirToZip(zip, BIN_DIR, 'wristport_data/bin', false);
    }
    zip.file('config.json', JSON.stringify(sdbConfig, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const elapsed = Date.now() - start;

    pushLog('SUCCESS', 'Exported wristport Kotlin JVM + Java desktop kit');
    pushActivity({
      action: 'export-kotlin',
      title: 'Exported Kotlin JVM + Java Kit',
      target: 'wristport-kotlin-jvm-kit.zip',
      status: 'success',
      durationMs: elapsed,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="wristport-kotlin-jvm-kit.zip"');
    res.send(zipBuffer);
  });

  const EXE_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MiB per chunk (safely under 32 MiB Cloud Run limit)

  app.get('/api/release/meta', (_req: Request, res: Response) => {
    const exePath = path.resolve(HOST_BASE_DIR, 'release', 'wristport.exe');
    if (!fs.existsSync(exePath)) {
      res.status(404).json({ error: 'wristport.exe not built yet.' });
      return;
    }
    const stat = fs.statSync(exePath);
    res.json({
      filename: 'wristport.exe',
      size: stat.size,
      chunkSize: EXE_CHUNK_SIZE,
      totalChunks: Math.ceil(stat.size / EXE_CHUNK_SIZE),
    });
  });

  app.get('/api/release/chunk', (req: Request, res: Response) => {
    const exePath = path.resolve(HOST_BASE_DIR, 'release', 'wristport.exe');
    if (!fs.existsSync(exePath)) {
      res.status(404).json({ error: 'wristport.exe not built yet.' });
      return;
    }
    const index = Number.parseInt(String(req.query.index ?? '0'), 10);
    const stat = fs.statSync(exePath);
    const totalChunks = Math.ceil(stat.size / EXE_CHUNK_SIZE);
    if (!Number.isFinite(index) || index < 0 || index >= totalChunks) {
      res.status(400).json({ error: 'Invalid chunk index' });
      return;
    }
    const start = index * EXE_CHUNK_SIZE;
    const end = Math.min(stat.size, start + EXE_CHUNK_SIZE);
    const length = end - start;
    const buf = Buffer.allocUnsafe(length);
    const fd = fs.openSync(exePath, 'r');
    try {
      fs.readSync(fd, buf, 0, length, start);
    } finally {
      fs.closeSync(fd);
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  });

  const renderExeDownloaderHtml = () => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Download wristport.exe</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050608;color:#f4f5f7;font-family:system-ui,-apple-system,sans-serif}
    .card{width:min(440px,90vw);padding:28px;border-radius:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 60px rgba(0,0,0,.6)}
    h1{margin:0 0 8px;font-size:20px}
    p{margin:0 0 18px;color:#9ba1b2;font-size:14px;line-height:1.5}
    .bar{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin-bottom:14px}
    .fill{height:100%;width:0%;background:linear-gradient(90deg,#8ba8ff,#6ee7b7);transition:width .2s}
    button{width:100%;padding:12px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.5);background:linear-gradient(180deg,#d0e0ff,#94b4ff);color:#0a0d16;font-weight:600;font-size:14px;cursor:pointer}
    button:disabled{opacity:.6;cursor:wait}
  </style>
</head>
<body>
  <div class="card">
    <h1>Downloading wristport.exe</h1>
    <p id="status">Preparing Windows executable download...</p>
    <div class="bar"><div class="fill" id="fill"></div></div>
    <button id="btn" type="button">Download wristport.exe</button>
  </div>
  <script>
    const statusEl = document.getElementById('status');
    const fillEl = document.getElementById('fill');
    const btn = document.getElementById('btn');
    async function startDownload() {
      btn.disabled = true;
      try {
        const metaRes = await fetch('/api/release/meta');
        if (!metaRes.ok) throw new Error('Could not load release info');
        const meta = await metaRes.json();
        const parts = [];
        let downloaded = 0;
        for (let i = 0; i < meta.totalChunks; i++) {
          statusEl.textContent = 'Downloading chunk ' + (i + 1) + ' of ' + meta.totalChunks + ' (' + Math.round(meta.size / (1024 * 1024)) + ' MB total)...';
          const res = await fetch('/api/release/chunk?index=' + i);
          if (!res.ok) throw new Error('Chunk ' + i + ' failed (HTTP ' + res.status + ')');
          const buf = await res.arrayBuffer();
          parts.push(buf);
          downloaded += buf.byteLength;
          fillEl.style.width = Math.round((downloaded / meta.size) * 100) + '%';
        }
        const blob = new Blob(parts, { type: 'application/vnd.microsoft.portable-executable' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = meta.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        statusEl.textContent = 'Download complete! Save wristport.exe and double-click it on Windows.';
      } catch (err) {
        statusEl.textContent = 'Error: ' + err.message;
      } finally {
        btn.disabled = false;
      }
    }
    btn.addEventListener('click', startDownload);
    startDownload();
  </script>
</body>
</html>`;

  app.get('/download-exe', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderExeDownloaderHtml());
  });

  app.get('/wristport.exe', (_req: Request, res: Response) => {
    const exePath = path.resolve(HOST_BASE_DIR, 'release', 'wristport.exe');
    if (!fs.existsSync(exePath)) {
      res.status(404).send('wristport.exe not built yet.');
      return;
    }
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.download(exePath, 'wristport.exe');
  });

  const embeddedAssets = (
    globalThis as { __WRISTPORT_EMBEDDED_DIST__?: Record<string, { mime: string; data: Buffer }> }
  ).__WRISTPORT_EMBEDDED_DIST__;

  if (IS_STANDALONE && embeddedAssets) {
    app.get('*', (req: Request, res: Response) => {
      const reqPath = (req.path || '/').replace(/^\/+/, '');
      const asset = embeddedAssets[reqPath] || embeddedAssets['index.html'];
      if (!asset) {
        res.status(404).send('Not found');
        return;
      }
      res.setHeader('Content-Type', asset.mime);
      res.send(asset.data);
    });
  } else if (!IS_PROD && !IS_STANDALONE) {
    const vitePkgName = 'vite';
    const { createServer: createViteServer } = await import(vitePkgName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(HOST_BASE_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const openBrowserUrl = (url: string) => {
    try {
      if (process.platform === 'win32') {
        execFile('cmd', ['/c', 'start', '', url], { windowsHide: true }, () => {});
      } else if (process.platform === 'darwin') {
        execFile('open', [url], () => {});
      } else {
        execFile('xdg-open', [url], () => {});
      }
    } catch {
      // Ignore browser launch errors
    }
  };

  if (IS_STANDALONE) {
    const host = '127.0.0.1';
    const srv = app.listen(PORT, host, () => {
      const addr = srv.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : PORT;
      const appUrl = `http://${host}:${actualPort}`;
      console.log('============================================================');
      console.log(`  wristport desktop app running at ${appUrl}`);
      console.log(`  Workspace folder: ${APP_HOME}`);
      console.log('  Keep this window open while using wristport.');
      console.log('============================================================');
      if (process.env.WRISTPORT_NO_BROWSER !== '1') {
        openBrowserUrl(appUrl);
      }
    });
    srv.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const fallbackSrv = app.listen(0, host, () => {
          const addr = fallbackSrv.address();
          const actualPort = typeof addr === 'object' && addr ? addr.port : PORT;
          const appUrl = `http://${host}:${actualPort}`;
          console.log(`[wristport] Port ${PORT} busy, started at ${appUrl}`);
          if (process.env.WRISTPORT_NO_BROWSER !== '1') {
            openBrowserUrl(appUrl);
          }
        });
      } else {
        console.error('[wristport] Server failed to start:', err);
        process.exit(1);
      }
    });
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[wristport] Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
