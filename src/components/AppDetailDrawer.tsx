import { useEffect, useState } from 'react';
import { AppIconArtwork } from './AppIconArtwork';
import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner, M3WavyLinearProgress } from './M3WavyProgress';
import type { SdbLogEntry, SdbWorkspaceStatus, TizenApp, WatchDevice } from '../types';

interface AppDetailDrawerProps {
  app: TizenApp | null;
  watch: WatchDevice | null;
  workspace: SdbWorkspaceStatus | null;
  isInstalled: boolean;
  isInstalling: boolean;
  installProgress: number;
  installError: string | null;
  recentLogs: SdbLogEntry[];
  onClose: () => void;
  onInstall: (app: TizenApp) => void;
  onUninstall: (packageId: string) => void;
  onOpenConnect: () => void;
  onOpenUploadSdb: () => void;
}

export function AppDetailDrawer({
  app,
  watch,
  workspace,
  isInstalled,
  isInstalling,
  installProgress,
  installError,
  recentLogs,
  onClose,
  onInstall,
  onUninstall,
  onOpenConnect,
  onOpenUploadSdb,
}: AppDetailDrawerProps) {
  const [hydratedApp, setHydratedApp] = useState<TizenApp | null>(app);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setHydratedApp(app);
    if (!app || !app.isLiveArchive) {
      setLoadingDetail(false);
      return;
    }

    let active = true;
    setLoadingDetail(true);
    fetch(`/api/archive/package/${encodeURIComponent(app.packageId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.detail) return;
        const d = data.detail;
        setHydratedApp((prev) =>
          prev
            ? {
                ...prev,
                packageType: d.packageType || prev.packageType,
                fileSize: d.fileSize || prev.fileSize,
                artifactHash: d.artifactHash || prev.artifactHash,
                artifactFilename: d.artifactFilename || prev.artifactFilename,
                signatureStatus: d.signatureStatus || prev.signatureStatus,
                sha256: d.artifactHash || prev.sha256,
              }
            : prev
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [app]);

  if (!hydratedApp) return null;

  const sdbReady = Boolean(workspace?.uploaded);
  const downloadUrl = `/api/packages/${encodeURIComponent(hydratedApp.id)}/download`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/58 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-app-title"
    >
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      <div className="lg-surface-elevated flex h-full w-full max-w-lg flex-col border-l">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-[12px] text-[#9BA1B2]">
            <span>Tizen Archive</span>
            <span>/</span>
            <span className="text-[#F4F5F7]">{hydratedApp.category}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg-pill rounded-full p-1.5 text-[#9BA1B2] hover:text-[#F4F5F7]"
            aria-label="Close app details"
          >
            <M3Icon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div
            className="flex items-center gap-4 rounded-[24px] border border-white/18 p-5 backdrop-blur-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]"
            style={{
              background: `linear-gradient(135deg, ${hydratedApp.gradientFrom}bb 0%, ${hydratedApp.gradientTo}cc 100%)`,
            }}
          >
            <div className="lg-orb flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border">
              {hydratedApp.iconUrl ? (
                <img
                  src={hydratedApp.iconUrl}
                  alt={hydratedApp.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <AppIconArtwork
                  iconKey={hydratedApp.iconKey}
                  accentColor={hydratedApp.accentColor}
                  size={38}
                />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="drawer-app-title"
                className="truncate font-display text-xl font-bold text-[#F4F5F7]"
              >
                {hydratedApp.title}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#C4C9D8]">
                {hydratedApp.developer} · v{hydratedApp.version}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-[#B8CEFF] tabular-nums">
                <span>{hydratedApp.packageType}</span>
                <span className="text-white/30">·</span>
                <span>{hydratedApp.fileSize}</span>
                {loadingDetail && <M3WavyCircularSpinner size={14} />}
              </div>
            </div>
          </div>

          {installError && (
            <div className="rounded-[16px] border border-[#E05A5A]/40 bg-[#E05A5A]/15 px-4 py-3 text-[12.5px] leading-relaxed text-[#F8B4B4] backdrop-blur-md">
              {installError}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-[#868DA0]">
              Overview
            </h3>
            <p className="text-[14px] leading-relaxed text-[#D8DDE9]">
              {hydratedApp.description}
            </p>
            <ul className="mt-2 space-y-1.5 pt-1 text-[13px] text-[#9BA1B2]">
              {hydratedApp.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8CEFF]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="lg-surface rounded-[18px] border p-3.5">
              <div className="flex items-center gap-1.5 text-[11.5px] text-[#868DA0]">
                <M3Icon name="memory" size={15} />
                <span>Package ID</span>
              </div>
              <p className="mt-1 truncate font-mono text-[12px] text-[#F4F5F7]">
                {hydratedApp.packageId}
              </p>
            </div>

            <div className="lg-surface rounded-[18px] border p-3.5">
              <div className="flex items-center gap-1.5 text-[11.5px] text-[#868DA0]">
                <M3Icon name="watch" size={15} />
                <span>Compatibility</span>
              </div>
              <p className="mt-1 truncate text-[12px] text-[#F4F5F7]">
                {hydratedApp.compatibility.join(', ')}
              </p>
            </div>
          </div>

          <div className="lg-surface space-y-1.5 rounded-[18px] border p-4">
            <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-[#E4E7F0]">
              <span className="flex items-center gap-2">
                <M3Icon name="verified_user" size={17} className="text-[#B8CEFF]" />
                <span>{hydratedApp.signatureStatus || 'Archive Integrity & pkgcmd -i -w'}</span>
              </span>
              {hydratedApp.sourceUrl && (
                <a
                  href={hydratedApp.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-[#B8CEFF] hover:underline"
                >
                  <span>Source</span>
                  <M3Icon name="open_in_new" size={13} />
                </a>
              )}
            </div>
            {hydratedApp.artifactFilename && (
              <p className="font-mono text-[11.5px] text-[#D8DDE9]">
                Artifact: {hydratedApp.artifactFilename}
              </p>
            )}
            <p className="break-all font-mono text-[11px] text-[#868DA0]">
              SHA-256: {hydratedApp.sha256}
            </p>
          </div>

          {(isInstalling || recentLogs.length > 0) && (
            <div className="lg-inset space-y-3 rounded-[18px] border p-4">
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 font-medium text-[#F4F5F7]">
                  <M3Icon name="terminal" size={16} className="text-[#B8CEFF]" />
                  <span>SDB Transfer &amp; pkgcmd -i -w</span>
                </span>
              </div>

              {isInstalling && (
                <M3WavyLinearProgress
                  value={installProgress}
                  label="Downloading artifact & running real sdb push / pkgcmd -i -w..."
                />
              )}

              <div className="max-h-36 space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {recentLogs.slice(-6).map((entry) => (
                  <div key={entry.id} className="flex gap-2">
                    <span
                      className={
                        entry.level === 'SUCCESS'
                          ? 'text-[#4ADE80]'
                          : entry.level === 'ERROR'
                          ? 'text-[#E05A5A]'
                          : entry.level === 'CMD'
                          ? 'text-[#B8CEFF]'
                          : 'text-[#9BA1B2]'
                      }
                    >
                      [{entry.level}]
                    </span>
                    <span className="break-all text-[#D8DDE9]">{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Stadium Pill Actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-white/[0.04] px-6 py-4">
          {!sdbReady ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUploadSdb();
              }}
              className="lg-pill-accent flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-[#0A0D16] transition-all"
            >
              <M3Icon name="upload_file" size={17} />
              <span>Add sdb.exe to Download</span>
            </button>
          ) : !watch ? (
            <button
              type="button"
              onClick={onOpenConnect}
              className="lg-pill-accent flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-[#0A0D16] transition-all"
            >
              <M3Icon name="wifi" size={17} />
              <span>Connect Watch to Install</span>
            </button>
          ) : isInstalled ? (
            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#4ADE80]/35 bg-[#4ADE80]/15 px-4 py-2.5 text-[13px] font-semibold text-[#6EE7B7] backdrop-blur-md">
                <M3Icon name="check_circle" filled size={17} />
                <span>Installed on Watch</span>
              </div>
              <button
                type="button"
                onClick={() => onUninstall(hydratedApp.packageId)}
                className="inline-flex items-center justify-center rounded-full border border-[#E05A5A]/35 bg-[#E05A5A]/15 p-2.5 text-[#F58585] hover:bg-[#E05A5A]/25"
                title="Uninstall from watch"
              >
                <M3Icon name="delete" size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isInstalling}
              onClick={() => onInstall(hydratedApp)}
              className="lg-pill-accent flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-[#0A0D16] transition-all disabled:opacity-65"
            >
              <M3Icon name="install_mobile" size={17} />
              <span>
                {isInstalling
                  ? 'Installing via SDB...'
                  : `Install to Watch (${hydratedApp.packageType})`}
              </span>
            </button>
          )}

          {sdbReady ? (
            <a
              href={downloadUrl}
              download
              className="lg-pill inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-[#F4F5F7] transition-all"
            >
              <M3Icon name="download" size={17} className="text-[#B8CEFF]" />
              <span>Download {hydratedApp.packageType}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUploadSdb();
              }}
              className="lg-pill inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-[#F4F5F7] transition-all"
            >
              <M3Icon name="download" size={17} className="text-[#B8CEFF]" />
              <span>Download {hydratedApp.packageType}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
