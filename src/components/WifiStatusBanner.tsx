import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner } from './M3WavyProgress';
import type { SdbWorkspaceStatus, WatchDevice } from '../types';

interface WifiStatusBannerProps {
  watch: WatchDevice | null;
  workspace: SdbWorkspaceStatus | null;
  discovering: boolean;
  onUploadSdb: () => void;
  onDiscoverOrConnect: () => void;
}

export function WifiStatusBanner({
  watch,
  workspace,
  discovering,
  onUploadSdb,
  onDiscoverOrConnect,
}: WifiStatusBannerProps) {
  const sdbUploaded = Boolean(workspace?.uploaded);
  const windowsExeOnLinux =
    sdbUploaded && !workspace?.executableOnHost && workspace?.binaryFormat === 'pe-windows';

  return (
    <div className="lg-surface flex flex-col justify-between gap-3 rounded-[20px] border px-5 py-3.5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[14px] border ${
            watch
              ? 'border-[#4ADE80]/35 bg-[#4ADE80]/15 text-[#4ADE80] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
              : sdbUploaded
              ? 'border-[#A8C0FF]/35 bg-[#A8C0FF]/15 text-[#B8CEFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
              : 'lg-orb text-[#9BA1B2]'
          }`}
        >
          {discovering ? (
            <M3WavyCircularSpinner size={18} />
          ) : (
            <M3Icon
              name={watch ? 'wifi' : sdbUploaded ? 'radar' : 'upload_file'}
              size={19}
            />
          )}
        </div>

        <p className="text-[13.5px] text-[#A3AAC0]">
          {watch ? (
            <>
              <span className="font-semibold text-[#F4F5F7]">
                {watch.name} connected ({watch.serial})
              </span>{' '}
              — Tizen {watch.tizenVersion} · Ready to install &amp; back up packages.
            </>
          ) : discovering ? (
            <span className="font-semibold text-[#F4F5F7]">
              Scanning watches via SDB &amp; TCP port 26101...
            </span>
          ) : !sdbUploaded ? (
            <>
              <span className="font-semibold text-[#F4F5F7]">SDB Setup Required</span> — Add your{' '}
              <code className="text-[#B8CEFF]">sdb.exe</code> file in the workspace to discover watches and install apps
            </>
          ) : windowsExeOnLinux ? (
            <>
              <span className="font-semibold text-[#F4F5F7]">
                {workspace?.binaryName} staged in workspace
              </span>{' '}
              — Ready to connect your Galaxy Watch from wristport on Windows
            </>
          ) : (
            <>
              <span className="font-semibold text-[#F4F5F7]">SDB ready ({workspace?.binaryName})</span>{' '}
              — Scan port <code className="text-[#B8CEFF]">26101</code> or connect with your watch&apos;s last IP digits
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onUploadSdb}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#B8CEFF] transition-colors hover:bg-white/10 hover:text-[#DCE6FF] whitespace-nowrap"
        >
          <span>{sdbUploaded ? 'Replace SDB' : 'Upload sdb.exe'}</span>
          <M3Icon name="arrow_outward" size={16} />
        </button>

        <button
          type="button"
          onClick={onDiscoverOrConnect}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap ${
            watch
              ? 'border-[#4ADE80]/35 bg-[#4ADE80]/15 text-[#6EE7B7] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
              : 'lg-pill text-[#A3AAC0] hover:text-[#F4F5F7]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              watch
                ? 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.65)]'
                : 'bg-[#E05A5A] shadow-[0_0_8px_rgba(224,90,90,0.55)]'
            }`}
          />
          <span>{watch ? 'Connected' : sdbUploaded ? 'Scan / Connect' : 'Offline'}</span>
        </button>
      </div>
    </div>
  );
}
