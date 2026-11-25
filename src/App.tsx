import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HeroBanner } from './components/HeroBanner';
import { WifiStatusBanner } from './components/WifiStatusBanner';
import { ArchiveSection, type CategoryFilter } from './components/ArchiveSection';
import { BeginnersGuideSection } from './components/BeginnersGuideSection';
import { AppDetailDrawer } from './components/AppDetailDrawer';
import { InstalledView } from './components/InstalledView';
import { ActivityView } from './components/ActivityView';
import { ConnectWatchModal } from './components/ConnectWatchModal';
import { SettingsSdbModal, type SettingsTab } from './components/SettingsSdbModal';
import { SdbUploadGateModal } from './components/SdbUploadGateModal';
import { WatchUpdatesModal } from './components/WatchUpdatesModal';
import { ThemesView } from './components/ThemesView';
import { FirstBootSetupWizard } from './components/FirstBootSetupWizard';
import { FastUpdatesCheckScreen } from './components/FastUpdatesCheckScreen';
import { LiquidBackdropCanvas } from './components/LiquidBackdropCanvas';
import { LiquidGlassEngine } from './components/LiquidGlassEngine';
import { DEFAULT_THEME_CONFIG, applyThemeToDocument } from './themes/themeRegistry';
import { compareVersions } from './utils/versionCompare';
import type {
  ActivityRecord,
  HeroWatchModel,
  InstalledApp,
  SdbConfig,
  SdbLogEntry,
  SdbWorkspaceStatus,
  SidebarTab,
  ThemeConfig,
  TizenApp,
  WatchAppUpdate,
  WatchDevice,
  WatchDiscoveryResult,
} from './types';

const THEME_STORAGE_KEY = 'wristport_theme_v2';

function loadStoredTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_CONFIG;
    return { ...DEFAULT_THEME_CONFIG, ...(JSON.parse(raw) as Partial<ThemeConfig>) };
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
}

applyThemeToDocument(loadStoredTheme());

function saveStoredTheme(theme: ThemeConfig): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Ignore storage quota errors
  }
}

const DEFAULT_CONFIG: SdbConfig = {
  sdbPath: '',
  bridgeUrl: 'http://127.0.0.1:8765',
  defaultPort: 26101,
  subnetPrefix: '192.168.1',
  lastIpOctet: '',
  authorCertPath: '',
  distributorCertPath: '',
  verboseLogging: true,
  theme: DEFAULT_THEME_CONFIG,
};

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All apps');
  const [selectedApp, setSelectedApp] = useState<TizenApp | null>(null);

  const [catalogApps, setCatalogApps] = useState<TizenApp[]>([]);
  const [isSyncingArchive, setIsSyncingArchive] = useState(true);
  const [isLiveArchive, setIsLiveArchive] = useState(false);

  const [workspace, setWorkspace] = useState<SdbWorkspaceStatus | null>(null);
  const [watch, setWatch] = useState<WatchDevice | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [logs, setLogs] = useState<SdbLogEntry[]>([]);
  const [config, setConfig] = useState<SdbConfig>(() => ({
    ...DEFAULT_CONFIG,
    theme: loadStoredTheme(),
  }));

  const [uploadGateOpen, setUploadGateOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [scanStatusNote, setScanStatusNote] = useState<string | null>(null);
  const [discoveringWatches, setDiscoveringWatches] = useState(false);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('sdb');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [installingAppId, setInstallingAppId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [installError, setInstallError] = useState<string | null>(null);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [updatingPackageId, setUpdatingPackageId] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const promptedWatchSerialRef = useRef<string | null>(null);

  const [firstBootModalOpen, setFirstBootModalOpen] = useState(() => {
    try {
      return localStorage.getItem('wristport_first_boot_completed') !== 'true';
    } catch {
      return false;
    }
  });

  const [checkingForUpdates, setCheckingForUpdates] = useState(() => {
    try {
      return localStorage.getItem('wristport_first_boot_completed') === 'true';
    } catch {
      return true;
    }
  });

  const handleFirstBootSetupComplete = (finalTheme: ThemeConfig) => {
    try {
      localStorage.setItem('wristport_first_boot_completed', 'true');
    } catch {
      // Ignore quota error
    }
    setFirstBootModalOpen(false);
    handleThemeChange(finalTheme);
  };

  const handleStartDeviceSetup = (_watchModel: HeroWatchModel) => {
    setConnectModalOpen(true);
  };

  const fetchLiveArchive = async (query = '', forceRefresh = false) => {
    setIsSyncingArchive(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (forceRefresh) params.set('refresh', '1');
      const qs = params.toString();
      const url = qs ? `/api/archive/apps?${qs}` : '/api/archive/apps';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data.apps)) {
        setCatalogApps(data.apps as TizenApp[]);
        setIsLiveArchive(Boolean(data.live));
      } else {
        setCatalogApps([]);
        setIsLiveArchive(false);
      }
    } catch {
      setCatalogApps([]);
      setIsLiveArchive(false);
    } finally {
      setIsSyncingArchive(false);
    }
  };

  const refreshState = async () => {
    const res = await fetch('/api/sdb/state');
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        const mergedTheme: ThemeConfig = {
          ...DEFAULT_THEME_CONFIG,
          ...(data.config.theme || loadStoredTheme()),
        };
        if (data.config.theme) {
          saveStoredTheme(mergedTheme);
        }
        setConfig({ ...DEFAULT_CONFIG, ...data.config, theme: mergedTheme });
      }
      if (data.workspace) setWorkspace(data.workspace);
      if (data.watch !== undefined) setWatch(data.watch);
      if (Array.isArray(data.installedApps)) setInstalledApps(data.installedApps);
      if (Array.isArray(data.activities)) setActivities(data.activities);
    }
  };

  const runDiscoverWatches = async (openFallbackModalIfNone = true): Promise<WatchDiscoveryResult> => {
    setDiscoveringWatches(true);
    try {
      const res = await fetch('/api/sdb/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: config.defaultPort || 26101 }),
      });
      const data = (await res.json()) as WatchDiscoveryResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Watch discovery failed.');
      }
      if (data.connectedWatch) {
        setWatch(data.connectedWatch);
      }
      if (Array.isArray(data.installedApps)) {
        setInstalledApps(data.installedApps);
      }
      await refreshState();

      if (data.needsManualIp && openFallbackModalIfNone) {
        setScanStatusNote(
          data.reason ||
            'No watches found automatically on port 26101. Enter only the last digits of your watch IP.'
        );
        setConnectModalOpen(true);
      }
      return data;
    } finally {
      setDiscoveringWatches(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetch('/api/sdb/state')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.config) {
          const mergedTheme: ThemeConfig = {
            ...DEFAULT_THEME_CONFIG,
            ...(data.config.theme || loadStoredTheme()),
          };
          if (data.config.theme) {
            saveStoredTheme(mergedTheme);
          }
          setConfig({ ...DEFAULT_CONFIG, ...data.config, theme: mergedTheme });
        }
        if (data.workspace) setWorkspace(data.workspace);
        if (data.watch !== undefined) setWatch(data.watch);
        if (Array.isArray(data.installedApps)) setInstalledApps(data.installedApps);
        if (Array.isArray(data.activities)) setActivities(data.activities);
        if (Array.isArray(data.logs)) setLogs(data.logs);

        const ws = data.workspace as SdbWorkspaceStatus | undefined;
        if (!ws || !ws.uploaded) {
          setUploadGateOpen(true);
        } else if (ws.executableOnHost && !data.watch) {
          void runDiscoverWatches(true);
        }
      })
      .catch(() => {
        setUploadGateOpen(true);
      });

    void fetchLiveArchive();

    const eventSource = new EventSource('/api/sdb/logs/stream');
    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as SdbLogEntry;
        setLogs((prev) => [...prev.slice(-399), entry]);
      } catch {
        // Ignore malformed frame
      }
    };

    return () => {
      active = false;
      eventSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyThemeToDocument(config.theme);
  }, [config.theme]);

  const didMountSearchRef = useRef(false);
  useEffect(() => {
    if (!didMountSearchRef.current) {
      didMountSearchRef.current = true;
      return;
    }
    const trimmed = searchQuery.trim();
    const timer = setTimeout(() => {
      void fetchLiveArchive(trimmed);
    }, trimmed ? 420 : 120);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compare installed watch packages against catalog versions to detect available updates
  const availableUpdates = useMemo<WatchAppUpdate[]>(() => {
    if (!watch || installedApps.length === 0 || catalogApps.length === 0) {
      return [];
    }
    const catalogByPkgId = new Map<string, TizenApp>();
    for (const app of catalogApps) {
      catalogByPkgId.set(app.packageId.toLowerCase(), app);
    }

    const updates: WatchAppUpdate[] = [];
    for (const installed of installedApps) {
      const match = catalogByPkgId.get(installed.packageId.toLowerCase());
      if (!match) continue;
      if (compareVersions(match.version, installed.version) > 0) {
        updates.push({
          installed,
          latestApp: match,
          currentVersion: installed.version,
          latestVersion: match.version,
        });
      }
    }
    return updates;
  }, [watch, installedApps, catalogApps]);

  // Prompt for available watch app updates the moment a watch pairs
  useEffect(() => {
    if (!watch) {
      promptedWatchSerialRef.current = null;
      setUpdatesModalOpen(false);
      return;
    }
    if (
      availableUpdates.length > 0 &&
      promptedWatchSerialRef.current !== watch.serial
    ) {
      promptedWatchSerialRef.current = watch.serial;
      setUpdateError(null);
      setUpdatesModalOpen(true);
    }
  }, [watch, availableUpdates]);

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalogApps.filter((app) => {
      const matchesCategory =
        categoryFilter === 'All apps' || app.category === categoryFilter;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        app.title.toLowerCase().includes(query) ||
        app.developer.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query) ||
        app.packageType.toLowerCase().includes(query) ||
        app.packageId.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query)
      );
    });
  }, [catalogApps, searchQuery, categoryFilter]);

  const handleSdbUploaded = async (nextStatus: SdbWorkspaceStatus) => {
    setWorkspace(nextStatus);
    await refreshState();
    if (nextStatus.executableOnHost) {
      setUploadGateOpen(false);
      await runDiscoverWatches(true);
    }
  };

  const handleDiscoverOrConnectClick = async () => {
    if (!workspace?.uploaded) {
      setUploadGateOpen(true);
      return;
    }
    if (watch || !workspace.executableOnHost) {
      setScanStatusNote(workspace.error || null);
      setConnectModalOpen(true);
      return;
    }
    try {
      await runDiscoverWatches(true);
    } catch (err) {
      setScanStatusNote((err as Error).message);
      setConnectModalOpen(true);
    }
  };

  const handleGlobalSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim() && activeTab !== 'apps') {
      setActiveTab('apps');
    }
  };

  const handleConnectWatch = async (payload: {
    ip?: string;
    octet?: string;
    subnetPrefix?: string;
    port: number;
  }) => {
    const res = await fetch('/api/sdb/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to connect to watch via SDB.');
    }
    setWatch(data.watch);
    if (Array.isArray(data.installedApps)) setInstalledApps(data.installedApps);
    await refreshState();
  };

  const handleDisconnectWatch = async () => {
    await fetch('/api/sdb/disconnect', { method: 'POST' });
    setWatch(null);
    setInstalledApps([]);
    setBackupMessage(null);
    setBackupError(null);
    await refreshState();
  };

  const handleRefreshInstalled = async () => {
    const res = await fetch('/api/sdb/installed/refresh', { method: 'POST' });
    const data = await res.json();
    if (res.ok && Array.isArray(data.installedApps)) {
      setInstalledApps(data.installedApps);
    }
  };

  const installAppCore = async (app: TizenApp, uninstallFirst = false): Promise<boolean> => {
    setInstallError(null);
    setInstallingAppId(app.id);
    setInstallProgress(35);

    try {
      const res = await fetch('/api/sdb/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: app.id,
          packageId: app.packageId,
          title: app.title,
          packageType: app.packageType,
          category: app.category,
          version: app.version,
          uninstallFirst,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'SDB installation failed.';
        setInstallError(errMsg);
        setUpdateError(errMsg);
        return false;
      }
      setInstallProgress(100);
      if (Array.isArray(data.installedApps)) setInstalledApps(data.installedApps);
      if (data.watch) setWatch(data.watch);
      await refreshState();
      return true;
    } catch (err) {
      const errMsg = (err as Error).message || 'Install request failed.';
      setInstallError(errMsg);
      setUpdateError(errMsg);
      return false;
    } finally {
      setTimeout(() => {
        setInstallingAppId(null);
        setInstallProgress(0);
      }, 350);
    }
  };

  const handleInstallApp = async (app: TizenApp) => {
    if (!workspace?.uploaded) {
      setUploadGateOpen(true);
      return;
    }
    if (!watch) {
      setConnectModalOpen(true);
      return;
    }
    await installAppCore(app, false);
  };

  const handleUpdateOneApp = async (update: WatchAppUpdate) => {
    if (!watch) return;
    setUpdateError(null);
    setUpdatingPackageId(update.latestApp.id);
    try {
      await installAppCore(update.latestApp, true);
    } finally {
      setUpdatingPackageId(null);
    }
  };

  const handleUpdateAllApps = async () => {
    if (!watch || availableUpdates.length === 0) return;
    setUpdateError(null);
    setUpdatingAll(true);
    try {
      for (const item of availableUpdates) {
        setUpdatingPackageId(item.latestApp.id);
        const ok = await installAppCore(item.latestApp, true);
        if (!ok) break;
      }
    } finally {
      setUpdatingPackageId(null);
      setUpdatingAll(false);
    }
  };

  const handleBackupWatch = async () => {
    if (!watch) {
      setConnectModalOpen(true);
      return;
    }
    setBackupError(null);
    setBackupMessage(null);
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/sdb/backup', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Watch backup failed.');
      }
      const fileCount = res.headers.get('X-Backup-Files') || '0';
      const pkgCount = res.headers.get('X-Backup-Packages') || String(installedApps.length);
      const filename =
        res.headers.get('X-Backup-Filename') ||
        `wristport-watch-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMessage(
        `Backup saved as ${filename} (${Math.max(1, Math.round(blob.size / 1024))} KB · ${fileCount} watch files & ${pkgCount} packages).`
      );
      await refreshState();
    } catch (err) {
      setBackupError((err as Error).message || 'Watch backup failed.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSideloadFile = async (file: File) => {
    if (!workspace?.uploaded) {
      setUploadGateOpen(true);
      return;
    }
    if (!watch) {
      setConnectModalOpen(true);
      return;
    }
    setInstallingAppId('local-sideload');
    setInstallProgress(45);

    try {
      const buf = await file.arrayBuffer();
      const fileBase64 = arrayBufferToBase64(buf);
      const res = await fetch('/api/sdb/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customFilename: file.name,
          fileBase64,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInstallProgress(100);
        if (Array.isArray(data.installedApps)) setInstalledApps(data.installedApps);
        if (data.watch) setWatch(data.watch);
        await refreshState();
      }
    } finally {
      setTimeout(() => {
        setInstallingAppId(null);
        setInstallProgress(0);
      }, 350);
    }
  };

  const handleUninstallApp = async (packageId: string) => {
    const res = await fetch('/api/sdb/uninstall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (res.ok) {
      if (Array.isArray(data.installedApps)) setInstalledApps(data.installedApps);
      if (data.watch) setWatch(data.watch);
      await refreshState();
    }
  };

  const handleLaunchApp = async (packageId: string) => {
    await fetch('/api/sdb/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: `sdb shell app_launcher -s ${packageId}`,
      }),
    });
  };

  const handleSaveConfig = async (nextConfig: SdbConfig) => {
    const normalizedTheme: ThemeConfig = {
      ...DEFAULT_THEME_CONFIG,
      ...nextConfig.theme,
    };
    saveStoredTheme(normalizedTheme);
    applyThemeToDocument(normalizedTheme);
    const payload: SdbConfig = { ...nextConfig, theme: normalizedTheme };
    const res = await fetch('/api/sdb/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.config) {
      setConfig({
        ...DEFAULT_CONFIG,
        ...data.config,
        theme: data.config.theme || normalizedTheme,
      });
    } else {
      setConfig(payload);
    }
  };

  const handleThemeChange = (nextTheme: ThemeConfig) => {
    saveStoredTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    setConfig((prev) => {
      const next = { ...prev, theme: nextTheme };
      void fetch('/api/sdb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {
        // Offline / transient save error already persisted in localStorage
      });
      return next;
    });
  };

  const handleToggleVerbose = async (verboseLogging: boolean) => {
    await handleSaveConfig({ ...config, verboseLogging });
  };

  const handleClearLogs = async () => {
    await fetch('/api/sdb/logs/clear', { method: 'POST' });
    setLogs([]);
  };

  const handleRunCommand = async (command: string) => {
    await fetch('/api/sdb/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
  };

  const openSettings = (tab: SettingsTab = 'sdb') => {
    setSettingsTab(tab);
    setSettingsModalOpen(true);
  };

  const scrollToArchive = () => {
    setActiveTab('apps');
    setTimeout(() => {
      document.getElementById('tizen-archive')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const installedIds = new Set(installedApps.map((a) => a.appId));

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#05070D] text-[#F4F5F7]">
      {/* Plain low-RAM static monochrome backdrop */}
      <LiquidBackdropCanvas />

      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        appsCount={catalogApps.length}
        installedCount={installedApps.length}
        watch={watch}
        onOpenConnect={handleDiscoverOrConnectClick}
        onOpenSettings={openSettings}
        isInstalling={Boolean(installingAppId)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        profileName={config.theme?.profileName}
        profileAvatar={config.theme?.profileAvatar}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={handleGlobalSearch}
          watch={watch}
          onOpenConnect={handleDiscoverOrConnectClick}
          onDisconnect={handleDisconnectWatch}
          onOpenActivity={() => setActiveTab('activity')}
          onOpenCustomize={() => setActiveTab('customize')}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          profileName={config.theme?.profileName}
          profileAvatar={config.theme?.profileAvatar}
        />

        <main className="flex-1 overflow-y-auto px-3 pt-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1220px] space-y-6 pb-8">
            {activeTab === 'discover' && (
              <>
                <HeroBanner
                  onExploreApps={scrollToArchive}
                  onConnectWatch={handleDiscoverOrConnectClick}
                  onOpenArchiveModal={() => openSettings('guide')}
                  onOpenCustomize={() => setActiveTab('customize')}
                  watchApps={catalogApps.filter((a) => a.category !== 'Watch faces')}
                  heroWatch={config.theme?.heroWatch}
                  heroStrap={config.theme?.heroStrap}
                />

                <WifiStatusBanner
                  watch={watch}
                  workspace={workspace}
                  discovering={discoveringWatches}
                  onUploadSdb={() => setUploadGateOpen(true)}
                  onDiscoverOrConnect={handleDiscoverOrConnectClick}
                />

                <BeginnersGuideSection
                  watch={watch}
                  workspace={workspace}
                  appsCount={catalogApps.length}
                  onOpenApps={() => setActiveTab('apps')}
                  onUploadSdb={() => setUploadGateOpen(true)}
                  onConnectWatch={handleDiscoverOrConnectClick}
                  onOpenWifiGuide={() => openSettings('guide')}
                />
              </>
            )}

            {activeTab === 'apps' && (
              <ArchiveSection
                apps={filteredApps}
                installedApps={installedApps}
                activeCategory={categoryFilter}
                onCategoryChange={setCategoryFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectApp={(app) => {
                  setInstallError(null);
                  setSelectedApp(app);
                }}
                onResetFilters={() => {
                  setCategoryFilter('All apps');
                  setSearchQuery('');
                }}
                onSyncLiveArchive={() => fetchLiveArchive(searchQuery, true)}
                isSyncingArchive={isSyncingArchive}
                isLiveArchive={isLiveArchive}
                onSideloadFile={handleSideloadFile}
              />
            )}

            {activeTab === 'installed' && (
              <InstalledView
                installedApps={installedApps}
                availableUpdates={availableUpdates}
                watch={watch}
                isInstalling={Boolean(installingAppId)}
                installProgress={installProgress}
                isBackingUp={isBackingUp}
                backupMessage={backupMessage}
                backupError={backupError}
                onBrowseArchive={() => setActiveTab('apps')}
                onOpenConnect={handleDiscoverOrConnectClick}
                onRefreshInstalled={handleRefreshInstalled}
                onBackupWatch={handleBackupWatch}
                onOpenUpdatesModal={() => {
                  setUpdateError(null);
                  setUpdatesModalOpen(true);
                }}
                onUpdateApp={handleUpdateOneApp}
                onUninstall={handleUninstallApp}
                onLaunchApp={(pkgId) => void handleLaunchApp(pkgId)}
                onSideloadFile={handleSideloadFile}
              />
            )}

            {activeTab === 'customize' && (
              <ThemesView theme={config.theme} onChangeTheme={handleThemeChange} />
            )}

            {activeTab === 'activity' && (
              <ActivityView
                activities={activities}
                logs={logs}
                verboseLogging={config.verboseLogging}
                onToggleVerbose={handleToggleVerbose}
                onClearLogs={handleClearLogs}
                onRunCommand={handleRunCommand}
              />
            )}
          </div>
        </main>
      </div>

      <AppDetailDrawer
        app={selectedApp}
        watch={watch}
        workspace={workspace}
        isInstalled={selectedApp ? installedIds.has(selectedApp.id) : false}
        isInstalling={Boolean(selectedApp && installingAppId === selectedApp.id)}
        installProgress={installProgress}
        installError={installError}
        recentLogs={logs}
        onClose={() => setSelectedApp(null)}
        onInstall={handleInstallApp}
        onUninstall={handleUninstallApp}
        onOpenConnect={handleDiscoverOrConnectClick}
        onOpenUploadSdb={() => setUploadGateOpen(true)}
      />

      <SdbUploadGateModal
        open={uploadGateOpen}
        workspace={workspace}
        onUploaded={handleSdbUploaded}
        onClose={() => setUploadGateOpen(false)}
      />

      <WatchUpdatesModal
        open={updatesModalOpen}
        watch={watch}
        updates={availableUpdates}
        updatingPackageId={updatingPackageId}
        updatingAll={updatingAll}
        updateProgress={installProgress}
        error={updateError}
        onUpdateOne={handleUpdateOneApp}
        onUpdateAll={handleUpdateAllApps}
        onClose={() => setUpdatesModalOpen(false)}
      />

      <ConnectWatchModal
        open={connectModalOpen}
        watch={watch}
        workspace={workspace}
        defaultPort={config.defaultPort}
        subnetPrefix={config.subnetPrefix}
        lastIpOctet={config.lastIpOctet}
        scanStatusNote={scanStatusNote}
        onClose={() => setConnectModalOpen(false)}
        onConnect={handleConnectWatch}
        onDisconnect={handleDisconnectWatch}
        onDiscoverWatches={() => runDiscoverWatches(false)}
        onOpenUploadSdb={() => setUploadGateOpen(true)}
      />

      <SettingsSdbModal
        open={settingsModalOpen}
        initialTab={settingsTab}
        config={config}
        workspace={workspace}
        onClose={() => setSettingsModalOpen(false)}
        onSaveConfig={handleSaveConfig}
        onChangeTheme={handleThemeChange}
        onOpenUploadSdb={() => setUploadGateOpen(true)}
      />

      <FirstBootSetupWizard
        open={firstBootModalOpen}
        onComplete={handleFirstBootSetupComplete}
        onStartDeviceSetup={handleStartDeviceSetup}
      />

      {checkingForUpdates && (
        <FastUpdatesCheckScreen onComplete={() => setCheckingForUpdates(false)} />
      )}

      {/* Optical Rounded-Rect Bezel Refraction & Cursor Light Driver for all UI blocks & tables */}
      <LiquidGlassEngine />
    </div>
  );
}
