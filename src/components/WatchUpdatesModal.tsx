import { AppIconArtwork } from './AppIconArtwork';
import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner, M3WavyLinearProgress } from './M3WavyProgress';
import type { WatchAppUpdate, WatchDevice } from '../types';

interface WatchUpdatesModalProps {
  open: boolean;
  watch: WatchDevice | null;
  updates: WatchAppUpdate[];
  updatingPackageId: string | null;
  updatingAll: boolean;
  updateProgress: number;
  error: string | null;
  onUpdateOne: (update: WatchAppUpdate) => void;
  onUpdateAll: () => void;
  onClose: () => void;
}

export function WatchUpdatesModal({
  open,
  watch,
  updates,
  updatingPackageId,
  updatingAll,
  updateProgress,
  error,
  onUpdateOne,
  onUpdateAll,
  onClose,
}: WatchUpdatesModalProps) {
  if (!open || !watch || updates.length === 0) return null;

  const isBusy = Boolean(updatingPackageId) || updatingAll;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-updates-title"
    >
      <div className="lg-surface-elevated flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="lg-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border text-[#6EE7B7]">
              <M3Icon name="system_update" filled size={22} />
            </div>
            <div>
              <h2
                id="watch-updates-title"
                className="font-display text-[18px] font-bold tracking-tight text-[#F4F5F7]"
              >
                App Updates Available
              </h2>
              <p className="text-[12.5px] text-[#9BA1B2]">
                {updates.length} app{updates.length === 1 ? '' : 's'} on {watch.name} have newer versions ready.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="lg-pill rounded-full p-1.5 text-[#9BA1B2] hover:text-[#F4F5F7] disabled:opacity-50"
            aria-label="Close updates prompt"
          >
            <M3Icon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Prominent Data-Loss Warning Banner */}
          <div
            role="alert"
            className="wp-erase-warning rounded-[18px] border-2 border-[#F59E0B]/70 bg-[#F59E0B]/16 p-4 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F59E0B]/25 text-[#FBBF24]">
                <M3Icon name="warning" filled size={24} />
              </div>
              <div className="space-y-1">
                <p className="wp-erase-warning-title font-display text-[14px] font-bold tracking-tight text-[#FDE68A]">
                  IMPORTANT: ALL DATA ON UPDATED APPS WILL BE ERASED
                </p>
                <p className="wp-erase-warning-body text-[12.5px] leading-relaxed text-[#FEF3C7]">
                  Because SDB cannot overwrite already-installed Tizen packages in place, updating an app{' '}
                  <strong>deletes the existing app from your watch first</strong> and then installs the new version.{' '}
                  All saved app data, logins, preferences, and watch face settings inside the updated app(s) will be permanently erased. Back up your watch before updating if needed.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-[16px] border border-[#E05A5A]/40 bg-[#E05A5A]/15 px-4 py-3 text-[12.5px] text-[#F8B4B4] backdrop-blur-md">
              {error}
            </div>
          )}

          {isBusy && (
            <div className="lg-surface rounded-[16px] border p-4">
              <M3WavyLinearProgress
                value={updateProgress}
                label="Uninstalling old version & installing update over SDB..."
              />
            </div>
          )}

          <div className="space-y-2.5">
            {updates.map((u) => {
              const isRowUpdating = updatingPackageId === u.latestApp.id;
              return (
                <div
                  key={u.installed.packageId}
                  className="lg-card flex items-center justify-between gap-3 rounded-[18px] border p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="lg-orb flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                      {u.latestApp.iconUrl ? (
                        <img
                          src={u.latestApp.iconUrl}
                          alt={u.latestApp.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <AppIconArtwork
                          iconKey={u.latestApp.iconKey}
                          accentColor={u.latestApp.accentColor}
                          size={24}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[14px] font-semibold text-[#F4F5F7]">
                        {u.latestApp.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11.5px] tabular-nums">
                        <span className="text-[#8D94A8]">v{u.currentVersion}</span>
                        <M3Icon name="arrow_forward" size={12} className="text-[#6EE7B7]" />
                        <span className="font-semibold text-[#6EE7B7]">v{u.latestVersion}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onUpdateOne(u)}
                    className="lg-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[#B8CEFF] disabled:opacity-50"
                  >
                    {isRowUpdating ? (
                      <M3WavyCircularSpinner size={14} />
                    ) : (
                      <M3Icon name="upgrade" size={15} />
                    )}
                    <span>{isRowUpdating ? 'Updating...' : 'Update'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-white/10 bg-white/[0.04] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="lg-pill rounded-full px-5 py-2 text-[13px] font-medium text-[#A3AAC0] hover:text-[#F4F5F7] disabled:opacity-50"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onUpdateAll}
            disabled={isBusy}
            className="lg-pill-accent inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold text-[#0A0D16] disabled:opacity-60"
          >
            <M3Icon name="system_update" size={16} />
            <span>
              {updatingAll ? 'Updating Watch Apps...' : `Update All (${updates.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
