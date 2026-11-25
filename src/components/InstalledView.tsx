import { useRef } from 'react';
import { AppIconArtwork } from './AppIconArtwork';
import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner, M3WavyLinearProgress } from './M3WavyProgress';
import type { InstalledApp, WatchAppUpdate, WatchDevice } from '../types';

interface InstalledViewProps {
  installedApps: InstalledApp[];
  availableUpdates: WatchAppUpdate[];
  watch: WatchDevice | null;
  isInstalling: boolean;
  installProgress: number;
  isBackingUp: boolean;
  backupMessage: string | null;
  backupError: string | null;
  onBrowseArchive: () => void;
  onOpenConnect: () => void;
  onRefreshInstalled: () => void;
  onBackupWatch: () => void;
  onOpenUpdatesModal: () => void;
  onUpdateApp: (update: WatchAppUpdate) => void;
  onUninstall: (packageId: string) => void;
  onLaunchApp: (packageId: string, title: string) => void;
  onSideloadFile: (file: File) => void;
}

export function InstalledView({
  installedApps,
  availableUpdates,
  watch,
  isInstalling,
  installProgress,
  isBackingUp,
  backupMessage,
  backupError,
  onBrowseArchive,
  onOpenConnect,
  onRefreshInstalled,
  onBackupWatch,
  onOpenUpdatesModal,
  onUpdateApp,
  onUninstall,
  onLaunchApp,
  onSideloadFile,
}: InstalledViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMap = new Map<string, WatchAppUpdate>(
    availableUpdates.map((u) => [u.installed.packageId.toLowerCase(), u])
  );

  const hasStorage =
    watch &&
    typeof watch.storageFreeMb === 'number' &&
    typeof watch.storageTotalMb === 'number' &&
    watch.storageTotalMb > 0;

  const usedMb = hasStorage ? watch.storageTotalMb! - watch.storageFreeMb! : 0;
  const usedPercent = hasStorage
    ? Math.min(100, Math.round((usedMb / watch.storageTotalMb!) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="lg-surface flex flex-col justify-between gap-4 rounded-[24px] border p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#B8CEFF]">
            WATCH STORAGE &amp; PACKAGES
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#F4F5F7]">
            Installed on your watch
          </h1>
          <p className="mt-1 text-[13.5px] text-[#9BA1B2]">
            {watch
              ? `${watch.name} · ${installedApps.length} package${
                  installedApps.length === 1 ? '' : 's'
                } installed`
              : 'Connect your Galaxy Watch via SDB to view, back up, update, and manage installed packages.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {watch && (
            <>
              <button
                type="button"
                onClick={onBackupWatch}
                disabled={isBackingUp}
                className="lg-pill inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12.5px] font-medium text-[#6EE7B7] disabled:opacity-60"
              >
                {isBackingUp ? (
                  <M3WavyCircularSpinner size={15} />
                ) : (
                  <M3Icon name="backup" size={16} />
                )}
                <span>{isBackingUp ? 'Backing up Watch...' : 'Backup Watch (.zip)'}</span>
              </button>

              <button
                type="button"
                onClick={onRefreshInstalled}
                className="lg-pill inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12.5px] font-medium text-[#E4E7F0]"
              >
                <M3Icon name="refresh" size={16} className="text-[#B8CEFF]" />
                <span>Refresh</span>
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".tpk,.wgt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onSideloadFile(file);
                e.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={() => {
              if (!watch) {
                onOpenConnect();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="lg-pill-accent inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#0A0D16] transition-all"
          >
            <M3Icon name={watch ? 'upload_file' : 'wifi'} size={17} />
            <span>{watch ? 'Sideload Local .tpk / .wgt' : 'Connect your watch'}</span>
          </button>
        </div>
      </div>

      {isBackingUp && (
        <div className="lg-surface rounded-[20px] border p-5">
          <M3WavyLinearProgress
            value={65}
            label="Backing up installed apps manifest, device info, and watch media/data via sdb pull..."
          />
        </div>
      )}

      {backupMessage && (
        <div className="lg-surface flex items-center gap-3 rounded-[18px] border border-[#4ADE80]/35 bg-[#4ADE80]/10 px-4 py-3 text-[13px] text-[#9DE8B4]">
          <M3Icon name="check_circle" filled size={18} className="shrink-0 text-[#4ADE80]" />
          <span>{backupMessage}</span>
        </div>
      )}

      {backupError && (
        <div className="rounded-[18px] border border-[#E05A5A]/40 bg-[#E05A5A]/15 px-4 py-3 text-[13px] text-[#F8B4B4] backdrop-blur-md">
          {backupError}
        </div>
      )}

      {watch && availableUpdates.length > 0 && (
        <div className="space-y-3">
          <div
            role="alert"
            className="wp-erase-warning flex items-start gap-3.5 rounded-[20px] border-2 border-[#F59E0B]/70 bg-[#F59E0B]/16 px-5 py-4 backdrop-blur-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F59E0B]/25 text-[#FBBF24]">
              <M3Icon name="warning" filled size={24} />
            </div>
            <div className="space-y-1">
              <p className="wp-erase-warning-title font-display text-[14.5px] font-bold tracking-tight text-[#FDE68A]">
                NOTICE BEFORE UPDATING: ALL APP DATA ON UPDATED APPS WILL BE ERASED
              </p>
              <p className="wp-erase-warning-body text-[12.5px] leading-relaxed text-[#FEF3C7]">
                SDB treats matching packages as already existing. Updating any app will{' '}
                <strong>uninstall it from your watch first</strong> and then install the latest release — all local app data, preferences, and saved progress for that app will be permanently deleted. Use{' '}
                <strong>Backup Watch (.zip)</strong> above first if you want a backup.
              </p>
            </div>
          </div>

          <div className="lg-surface flex flex-col justify-between gap-3 rounded-[20px] border border-[#4ADE80]/35 px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="lg-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border text-[#6EE7B7]">
                <M3Icon name="system_update" filled size={20} />
              </div>
              <div>
                <p className="font-display text-[14px] font-semibold text-[#F4F5F7]">
                  {availableUpdates.length} app update{availableUpdates.length === 1 ? '' : 's'} available
                </p>
                <p className="text-[12.5px] text-[#9BA1B2]">
                  Newer versions matched on your watch for {availableUpdates.map((u) => u.latestApp.title).slice(0, 3).join(', ')}
                  {availableUpdates.length > 3 ? ` +${availableUpdates.length - 3} more` : ''}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenUpdatesModal}
              className="lg-pill-accent inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#0A0D16]"
            >
              <M3Icon name="upgrade" size={16} />
              <span>Review Updates</span>
            </button>
          </div>
        </div>
      )}

      {isInstalling && (
        <div className="lg-surface rounded-[20px] border p-5">
          <M3WavyLinearProgress
            value={installProgress}
            label="Pushing package via sdb push & pkgcmd -i -w..."
          />
        </div>
      )}

      {hasStorage && (
        <div className="lg-surface rounded-[20px] border p-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 font-medium text-[#F4F5F7]">
              <M3Icon name="hard_drive" size={18} className="text-[#B8CEFF]" />
              <span>/opt/usr Internal Flash ({watch.model})</span>
            </span>
            <span className="font-mono text-[12px] text-[#9BA1B2] tabular-nums">
              {watch.storageFreeMb!.toFixed(0)} MB free of {watch.storageTotalMb} MB
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8BA8FF] to-[#B8CEFF] transition-all duration-300"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      )}

      {installedApps.length === 0 ? (
        <div className="lg-surface flex flex-col items-center justify-center rounded-[24px] border px-6 py-16 text-center">
          <div className="lg-orb flex h-13 w-13 items-center justify-center rounded-[18px] border text-[#B8CEFF]">
            <M3Icon name="layers" filled size={24} />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-[#F4F5F7]">
            {watch ? 'No user packages returned by pkgcmd -l' : 'No watch connected'}
          </h2>
          <p className="mt-1.5 max-w-md text-[13.5px] text-[#9BA1B2]">
            {watch
              ? 'Install apps from the Apps library or sideload your own local .tpk / .wgt package.'
              : 'Connect your Galaxy Watch over Wi-Fi SDB to read, back up, update, and manage installed packages.'}
          </p>
          <button
            type="button"
            onClick={watch ? onBrowseArchive : onOpenConnect}
            className="lg-pill-accent mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#0A0D16] transition-all"
          >
            <M3Icon name={watch ? 'apps' : 'wifi'} filled size={17} />
            <span>{watch ? 'Browse Apps' : 'Connect your watch'}</span>
          </button>
        </div>
      ) : (
        <div className="lg-surface divide-y divide-white/10 overflow-hidden rounded-[20px] border">
          {installedApps.map((item) => {
            const update = updateMap.get(item.packageId.toLowerCase());
            return (
              <div
                key={item.packageId}
                className="flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="lg-orb flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                    <AppIconArtwork iconKey={item.iconKey} accentColor="#A8C0FF" size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-[14.5px] font-semibold text-[#F4F5F7]">
                        {item.title}
                      </h3>
                      <span className="font-mono text-[11px] text-[#B8CEFF]">
                        {item.packageType}
                      </span>
                      {update && (
                        <span className="rounded-full border border-[#4ADE80]/35 bg-[#4ADE80]/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#6EE7B7]">
                          Update v{update.latestVersion}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11.5px] text-[#9BA1B2] tabular-nums">
                      {item.packageId} · v{item.version} · {item.fileSize}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {update && (
                    <button
                      type="button"
                      disabled={isInstalling}
                      onClick={() => onUpdateApp(update)}
                      className="lg-pill-accent inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#0A0D16] disabled:opacity-60"
                    >
                      <M3Icon name="upgrade" size={15} />
                      <span>Update</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onLaunchApp(item.packageId, item.title)}
                    className="lg-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-[#E4E7F0]"
                  >
                    <M3Icon name="play_arrow" filled size={16} className="text-[#4ADE80]" />
                    <span>Launch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUninstall(item.packageId)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E05A5A]/35 bg-[#E05A5A]/12 px-3.5 py-1.5 text-[12.5px] font-medium text-[#F58585] backdrop-blur-md transition-colors hover:bg-[#E05A5A]/20"
                  >
                    <M3Icon name="delete" size={15} />
                    <span>Uninstall</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
