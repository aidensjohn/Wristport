import { M3Icon } from './M3Icon';
import type { SdbWorkspaceStatus, WatchDevice } from '../types';

interface BeginnersGuideSectionProps {
  watch: WatchDevice | null;
  workspace: SdbWorkspaceStatus | null;
  appsCount: number;
  onOpenApps: () => void;
  onUploadSdb: () => void;
  onConnectWatch: () => void;
  onOpenWifiGuide: () => void;
}

export function BeginnersGuideSection({
  watch,
  workspace,
  appsCount,
  onOpenApps,
  onUploadSdb,
  onConnectWatch,
  onOpenWifiGuide,
}: BeginnersGuideSectionProps) {
  const sdbReady = Boolean(workspace?.uploaded);
  const watchReady = Boolean(watch);

  return (
    <section aria-label="Beginner Installation Guide" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#A8C0FF]">
            BEGINNER GUIDE
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#F4F5F7]">
            How to install apps on your watch
          </h2>
          <p className="mt-1 text-[13.5px] text-[#9197A8]">
            New to Tizen sideloading? Follow these four steps before opening the{' '}
            <button
              type="button"
              onClick={onOpenApps}
              className="font-medium text-[#B8CEFF] hover:underline"
            >
              Apps
            </button>{' '}
            library.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenWifiGuide}
            className="lg-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium text-[#E4E7F0] transition-all whitespace-nowrap"
          >
            <M3Icon name="help" size={16} className="text-[#B8CEFF]" />
            <span>Full Troubleshooting Guide</span>
          </button>

          <button
            type="button"
            onClick={onOpenApps}
            className="lg-pill-accent inline-flex items-center gap-2 rounded-full px-5 py-2 text-[12.5px] font-semibold text-[#0A0D16] transition-all whitespace-nowrap"
          >
            <M3Icon name="apps" filled size={16} />
            <span>
              Browse Apps{appsCount > 0 ? ` (${appsCount})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* 4-Step Walkthrough Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Step 1 */}
        <div className="lg-card flex flex-col justify-between rounded-[20px] border p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="lg-orb flex h-10 w-10 items-center justify-center rounded-[14px] border text-[#B8CEFF]">
                <M3Icon name="upload_file" size={20} />
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                  sdbReady
                    ? 'border border-[#4ADE80]/35 bg-[#4ADE80]/15 text-[#6EE7B7]'
                    : 'lg-pill text-[#A3AAC0]'
                }`}
              >
                {sdbReady ? 'STEP 01 · READY' : 'STEP 01'}
              </span>
            </div>

            <h3 className="mt-4 font-display text-[15.5px] font-semibold text-[#F4F5F7]">
              Add your real SDB file
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9BA1B2]">
              Upload <code className="text-[#B8CEFF]">sdb.exe</code> (Windows) or{' '}
              <code className="text-[#B8CEFF]">sdb</code> (Linux/macOS) into wristport so real commands can run.
            </p>
          </div>

          <button
            type="button"
            onClick={onUploadSdb}
            className="lg-pill mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium text-[#E4E7F0] transition-all"
          >
            <M3Icon name="folder_open" size={15} className="text-[#B8CEFF]" />
            <span>{sdbReady ? `Staged: ${workspace?.binaryName}` : 'Upload sdb.exe'}</span>
          </button>
        </div>

        {/* Step 2 */}
        <div className="lg-card flex flex-col justify-between rounded-[20px] border p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="lg-orb flex h-10 w-10 items-center justify-center rounded-[14px] border text-[#B8CEFF]">
                <M3Icon name="developer_mode" size={20} />
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                  watchReady
                    ? 'border border-[#4ADE80]/35 bg-[#4ADE80]/15 text-[#6EE7B7]'
                    : 'lg-pill text-[#A3AAC0]'
                }`}
              >
                {watchReady ? 'STEP 02 · READY' : 'STEP 02'}
              </span>
            </div>

            <h3 className="mt-4 font-display text-[15.5px] font-semibold text-[#F4F5F7]">
              Turn on Watch Debugging
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9BA1B2]">
              On your watch go to <strong className="text-[#E4E7F0]">Settings → About watch → Software</strong>, tap{' '}
              <strong className="text-[#E4E7F0]">Software version</strong> 5 times, turn on{' '}
              <strong className="text-[#E4E7F0]">Debugging</strong>, and reboot.
            </p>
          </div>

          <div
            className={`mt-4 flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] ${
              watchReady
                ? 'border border-[#4ADE80]/35 bg-[#4ADE80]/12 text-[#6EE7B7]'
                : 'lg-pill text-[#9BA1B2]'
            }`}
          >
            <M3Icon
              name={watchReady ? 'check_circle' : 'bluetooth_disabled'}
              size={15}
              className={watchReady ? 'text-[#4ADE80]' : 'text-[#B8CEFF]'}
            />
            <span>{watchReady ? 'Debugging active' : 'Turn Bluetooth OFF on watch'}</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="lg-card flex flex-col justify-between rounded-[20px] border p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="lg-orb flex h-10 w-10 items-center justify-center rounded-[14px] border text-[#B8CEFF]">
                <M3Icon name="wifi" size={20} />
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                  watchReady
                    ? 'border border-[#4ADE80]/35 bg-[#4ADE80]/15 text-[#6EE7B7]'
                    : 'lg-pill text-[#A3AAC0]'
                }`}
              >
                {watchReady ? 'STEP 03 · LINKED' : 'STEP 03'}
              </span>
            </div>

            <h3 className="mt-4 font-display text-[15.5px] font-semibold text-[#F4F5F7]">
              Pair over Wi-Fi (Port 26101)
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9BA1B2]">
              Connect your watch to the same Wi-Fi, scan port <code className="text-[#B8CEFF]">26101</code> or enter its trailing IP digits, then accept the{' '}
              <strong className="text-[#E4E7F0]">RSA prompt</strong> on your watch.
            </p>
          </div>

          <button
            type="button"
            onClick={onConnectWatch}
            className="lg-pill mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium text-[#E4E7F0] transition-all"
          >
            <M3Icon name="radar" size={15} className="text-[#B8CEFF]" />
            <span>{watchReady ? `Connected · ${watch?.ip}` : 'Scan or Enter IP Digits'}</span>
          </button>
        </div>

        {/* Step 4 */}
        <div className="lg-card flex flex-col justify-between rounded-[20px] border p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="lg-orb flex h-10 w-10 items-center justify-center rounded-[14px] border text-[#B8CEFF]">
                <M3Icon name="download" size={20} />
              </div>
              <span className="lg-pill rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#A3AAC0]">
                STEP 04
              </span>
            </div>

            <h3 className="mt-4 font-display text-[15.5px] font-semibold text-[#F4F5F7]">
              Install to your Galaxy Watch
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9BA1B2]">
              Open the <strong className="text-[#E4E7F0]">Apps</strong> tab in the sidebar, pick any app or watch face, and click install — wristport runs{' '}
              <code className="text-[#B8CEFF]">sdb push</code> &amp; <code className="text-[#B8CEFF]">pkgcmd -i -w</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenApps}
            className="lg-pill-accent mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-[#0A0D16] transition-all"
          >
            <span>Open Apps Tab</span>
            <M3Icon name="arrow_forward" size={15} />
          </button>
        </div>
      </div>

      {/* Package Formats & Watch Prep Summary Strip */}
      <div className="lg-surface grid grid-cols-1 gap-4 rounded-[20px] border p-5 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="lg-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border text-[#A8C0FF]">
            <M3Icon name="inventory_2" size={18} />
          </div>
          <div>
            <p className="font-display text-[13.5px] font-semibold text-[#F4F5F7]">
              .tpk Native Packages
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#9BA1B2]">
              Compiled Tizen apps, productivity tools, and native watch games installed via{' '}
              <code className="text-[#B8CEFF]">pkgcmd -t tpk</code>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="lg-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border text-[#6EE7B7]">
            <M3Icon name="watch" size={18} />
          </div>
          <div>
            <p className="font-display text-[13.5px] font-semibold text-[#F4F5F7]">
              .wgt Watch Faces &amp; Widgets
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#9BA1B2]">
              Web-runtime watch faces and widgets pushed to <code className="text-[#B8CEFF]">/tmp</code> and installed with{' '}
              <code className="text-[#B8CEFF]">pkgcmd -t wgt</code>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="lg-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border text-[#F5B971]">
            <M3Icon name="verified_user" size={18} />
          </div>
          <div>
            <p className="font-display text-[13.5px] font-semibold text-[#F4F5F7]">
              Watch Screen RSA Check
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#9BA1B2]">
              If your watch shows <code className="text-[#F5B971]">unauthorized</code>, wake the watch face and tap the green check to trust this PC.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
