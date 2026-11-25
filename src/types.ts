export type AppCategory =
  | 'Productivity apps'
  | 'Watch faces'
  | 'Games'
  | 'Utilities & Tools';

export type PackageFormat = '.tpk' | '.wgt';

export type SidebarTab = 'discover' | 'apps' | 'installed' | 'customize' | 'activity';

export type LogLevel = 'INFO' | 'CMD' | 'SDB' | 'VERBOSE' | 'SUCCESS' | 'WARN' | 'ERROR';

export interface TizenApp {
  id: string;
  packageId: string;
  title: string;
  developer: string;
  category: AppCategory;
  packageType: PackageFormat;
  fileSize: string;
  fileSizeBytes: number;
  version: string;
  tizenMin: string;
  compatibility: string[];
  description: string;
  highlights: string[];
  privileges: string[];
  sha256: string;
  artifactHash?: string;
  artifactFilename?: string;
  signatureStatus?: string;
  iconUrl?: string | null;
  sourceUrl?: string;
  isLiveArchive?: boolean;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  iconKey:
    | 'chronograph'
    | 'orbital2048'
    | 'voicenote'
    | 'flappy'
    | 'pipwatch'
    | 'pomodoro'
    | 'solitaire'
    | 'compass'
    | 'solar'
    | 'snake'
    | 'serverping'
    | 'bauhaus';
}

export interface SdbWorkspaceStatus {
  uploaded: boolean;
  executableOnHost: boolean;
  binaryName: string | null;
  binaryPath: string | null;
  binaryFormat: 'pe-windows' | 'elf-linux' | 'macho-macos' | 'unknown' | 'missing';
  binarySizeBytes: number;
  hostOs: string;
  sdbVersion: string | null;
  error: string | null;
  stagedFiles: string[];
  detectedSubnets: string[];
}

export interface WatchDevice {
  id: string;
  serial: string;
  name: string;
  model: string;
  ip: string;
  port: number;
  tizenVersion: string;
  platformArch?: string;
  firmware: string;
  storageFreeMb: number | null;
  storageTotalMb: number | null;
  batteryPercent?: number;
  connectedAt: string;
  authorizationState: 'device' | 'unauthorized' | 'offline';
  connectionSource: 'real-sdb-usb' | 'real-sdb-wifi';
}

export interface DiscoveredWatch {
  id: string;
  serial: string;
  name: string;
  model: string;
  ip: string;
  port: number;
  tizenVersion: string;
  latencyMs: number;
  source: 'sdb-devices' | 'port-26101-scan';
}

export interface WatchDiscoveryResult {
  devices: DiscoveredWatch[];
  connectedWatch: WatchDevice | null;
  installedApps: InstalledApp[];
  scannedSubnets: string[];
  needsManualIp: boolean;
  reason?: string;
}

export interface InstalledApp {
  appId: string;
  packageId: string;
  title: string;
  category: AppCategory;
  packageType: PackageFormat;
  version: string;
  fileSize: string;
  fileSizeMb: number;
  installedAt: string;
  source: 'archive' | 'sideload' | 'watch';
  iconKey: TizenApp['iconKey'] | 'custom';
}

export interface SdbLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  detail?: string;
}

export interface ActivityRecord {
  id: string;
  action:
    | 'install'
    | 'uninstall'
    | 'connect'
    | 'disconnect'
    | 'scan'
    | 'download'
    | 'export-kotlin'
    | 'upload-sdb'
    | 'backup'
    | 'update';
  title: string;
  target: string;
  status: 'success' | 'running' | 'failed';
  durationMs: number;
  timestamp: string;
}

export type ThemeFamily =
  | 'zorin'
  | 'liquid-glass'
  | 'material3'
  | 'catppuccin'
  | 'glassmorphism'
  | 'linear-obsidian'
  | 'bento-grid'
  | 'neo-brutalism';

export type ThemeMode = 'dark' | 'light';

export type AppFontId =
  | 'default'
  | 'sf-pro-display'
  | 'one-ui-sans'
  | 'oppo-sans'
  | 'google-sans'
  | 'inter'
  | 'space-grotesk'
  | 'nunito'
  | 'jetbrains-mono'
  | 'system';

export type Material3Color = 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet';

export type ZorinMode = 'dark' | 'light';

export type CatppuccinFlavor = 'latte' | 'frappe' | 'macchiato' | 'mocha';

export type CatppuccinAccent =
  | 'rosewater'
  | 'flamingo'
  | 'pink'
  | 'mauve'
  | 'red'
  | 'maroon'
  | 'peach'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'sky'
  | 'sapphire'
  | 'blue'
  | 'lavender';

export type HeroWatchModel =
  | 'galaxy-watch-1'
  | 'galaxy-watch-3'
  | 'gear-s3-classic'
  | 'gear-s3-frontier'
  | 'minimal-glass';

export type WatchStrapType = 'sports' | 'nylon' | 'leather' | 'milanese';

export interface ThemeConfig {
  family: ThemeFamily;
  mode: ThemeMode;
  fontFamily: AppFontId;
  material3Color: Material3Color;
  zorinMode: ZorinMode;
  catppuccinFlavor: CatppuccinFlavor;
  catppuccinAccent: CatppuccinAccent;
  heroWatch: HeroWatchModel;
  heroStrap: WatchStrapType;
  profileName: string;
  profileAvatar: string;
}

export interface SdbConfig {
  sdbPath: string;
  bridgeUrl: string;
  defaultPort: number;
  subnetPrefix: string;
  lastIpOctet?: string;
  authorCertPath: string;
  distributorCertPath: string;
  verboseLogging: boolean;
  theme?: ThemeConfig;
}

export interface HeroSlide {
  index: string;
  label: string;
  timeDisplay: string;
  subDisplay: string;
  accent: string;
  watchTitle: string;
}

export interface WatchAppUpdate {
  installed: InstalledApp;
  latestApp: TizenApp;
  currentVersion: string;
  latestVersion: string;
}
