import { useEffect, useState } from 'react';
import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner } from './M3WavyProgress';
import { ThemeSettingsPanel } from './ThemeSettingsPanel';
import { DEFAULT_THEME_CONFIG } from '../themes/themeRegistry';
import type { SdbConfig, SdbWorkspaceStatus, ThemeConfig } from '../types';

export type SettingsTab = 'sdb' | 'themes' | 'certs' | 'guide';

interface SettingsSdbModalProps {
  open: boolean;
  initialTab: SettingsTab;
  config: SdbConfig;
  workspace: SdbWorkspaceStatus | null;
  onClose: () => void;
  onSaveConfig: (next: SdbConfig) => Promise<void>;
  onChangeTheme?: (next: ThemeConfig) => void;
  onOpenUploadSdb: () => void;
}

export function SettingsSdbModal({
  open,
  initialTab,
  config,
  workspace,
  onClose,
  onSaveConfig,
  onChangeTheme,
  onOpenUploadSdb,
}: SettingsSdbModalProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [draft, setDraft] = useState<SdbConfig>(config);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [testingSdb, setTestingSdb] = useState(false);
  const [restartingSdb, setRestartingSdb] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<{
    sdbPath: string;
    version: string;
    devices: string;
  } | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  if (!open) return null;

  const activeTheme: ThemeConfig = {
    ...DEFAULT_THEME_CONFIG,
    ...draft.theme,
  };

  const updateTheme = (patch: Partial<ThemeConfig>) => {
    const nextTheme: ThemeConfig = {
      ...activeTheme,
      ...patch,
    };
    setDraft((prev) => ({
      ...prev,
      theme: nextTheme,
    }));
    onChangeTheme?.(nextTheme);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveConfig(draft);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSdbDevices = async () => {
    setTestingSdb(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/sdb/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || 'SDB check failed.');
      } else {
        setDiagResult({
          sdbPath: data.sdbPath || workspace?.binaryPath || '',
          version: data.version || 'Verified',
          devices: data.devices || 'No devices attached',
        });
      }
    } finally {
      setTestingSdb(false);
    }
  };

  const handleRestartSdbServer = async () => {
    setRestartingSdb(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/sdb/restart-server', { method: 'POST' });
      const data = await res.json();
      setStatusMessage(data.error || data.output || 'SDB daemon restarted.');
    } finally {
      setRestartingSdb(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'sdb', label: 'SDB Workspace', icon: 'terminal' },
    { id: 'themes', label: 'Customize App', icon: 'tune' },
    { id: 'certs', label: 'Certificates', icon: 'verified_user' },
    { id: 'guide', label: 'Wi-Fi Guide', icon: 'menu_book' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="lg-surface-elevated flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-[17px] font-bold text-[#F4F5F7]"
            >
              Settings, Customize App &amp; SDB Workspace
            </h2>
            <p className="text-[12px] text-[#9BA1B2]">
              Customize themes and fonts, manage your SDB executable, watch diagnostics, and signing certificates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg-pill rounded-full p-1.5 text-[#9BA1B2] hover:text-[#F4F5F7]"
            aria-label="Close settings"
          >
            <M3Icon name="close" size={18} />
          </button>
        </div>

        {/* Navigation Chips */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-white/[0.03] px-6 py-3">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'lg-pill-accent text-[#0A0D16] font-semibold'
                    : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
                }`}
              >
                <M3Icon name={item.icon} filled={active} size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {tab === 'sdb' && (
            <div className="space-y-4">
              {statusMessage && (
                <div className="rounded-[16px] border border-[#F5B971]/40 bg-[#F5B971]/12 px-4 py-3 text-[12.5px] text-[#FBE0B4] backdrop-blur-md">
                  {statusMessage}
                </div>
              )}

              {/* Uploaded Workspace Binary Card */}
              <div className="lg-surface space-y-3 rounded-[20px] border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-[#F4F5F7]">
                      Workspace SDB Binary (wristport_data/bin/)
                    </h3>
                    <p className="text-[12px] text-[#9BA1B2]">
                      Real executable staged directly inside the app workspace
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUploadSdb();
                    }}
                    className="lg-pill-accent inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold text-[#0A0D16]"
                  >
                    <M3Icon name="upload_file" size={16} />
                    <span>{workspace?.uploaded ? 'Replace / Upload SDB' : 'Upload sdb.exe...'}</span>
                  </button>
                </div>

                <div className="lg-inset space-y-1.5 rounded-[14px] border p-3.5 font-mono text-[11.5px]">
                  <p className="text-[#9BA1B2]">
                    Binary:{' '}
                    <span className="text-[#F4F5F7]">
                      {workspace?.binaryPath || 'Not uploaded yet'}
                    </span>
                  </p>
                  <p className="text-[#9BA1B2]">
                    Detected format:{' '}
                    <span className="text-[#B8CEFF]">{workspace?.binaryFormat || 'missing'}</span> · Host:{' '}
                    <span className="text-[#E4E7F0]">{workspace?.hostOs || 'unknown'}</span>
                  </p>
                  {workspace?.stagedFiles && workspace.stagedFiles.length > 0 && (
                    <p className="text-[#9BA1B2]">
                      Staged files:{' '}
                      <span className="text-[#CFD4E0]">{workspace.stagedFiles.join(', ')}</span>
                    </p>
                  )}
                  {workspace?.sdbVersion && (
                    <p className="text-[#4ADE80]">{workspace.sdbVersion}</p>
                  )}
                  {workspace?.error && (
                    <p className="font-sans text-[12px] text-[#F5B971]">{workspace.error}</p>
                  )}
                </div>
              </div>

              {/* Real Diagnostics */}
              <div className="lg-surface space-y-3 rounded-[20px] border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <M3Icon name="monitor_heart" size={18} className="text-[#B8CEFF]" />
                    <h3 className="text-[13.5px] font-semibold text-[#F4F5F7]">
                      Live SDB Diagnostics
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleTestSdbDevices}
                      disabled={testingSdb}
                      className="lg-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[#E4E7F0]"
                    >
                      {testingSdb ? (
                        <M3WavyCircularSpinner size={14} />
                      ) : (
                        <M3Icon name="terminal" size={15} className="text-[#B8CEFF]" />
                      )}
                      <span>Run sdb devices</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRestartSdbServer}
                      disabled={restartingSdb}
                      className="lg-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[#E4E7F0]"
                    >
                      <M3Icon name="restart_alt" size={15} className="text-[#F5B971]" />
                      <span>{restartingSdb ? 'Restarting...' : 'Restart SDB Server'}</span>
                    </button>
                  </div>
                </div>

                {diagResult && (
                  <div className="lg-inset space-y-1.5 rounded-[14px] border p-3 font-mono text-[11.5px]">
                    <p className="text-[#4ADE80]">{diagResult.version}</p>
                    <pre className="whitespace-pre-wrap text-[#CFD4E0]">{diagResult.devices}</pre>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#9BA1B2]">
                    Default Wi-Fi Subnet Prefix
                  </label>
                  <input
                    type="text"
                    value={draft.subnetPrefix}
                    onChange={(e) => setDraft({ ...draft, subnetPrefix: e.target.value })}
                    className="lg-input h-10 w-full rounded-full border px-4 font-mono text-[13px] text-[#F4F5F7] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#9BA1B2]">
                    Default SDB Port
                  </label>
                  <input
                    type="number"
                    value={draft.defaultPort}
                    onChange={(e) =>
                      setDraft({ ...draft, defaultPort: Number(e.target.value) || 26101 })
                    }
                    className="lg-input h-10 w-full rounded-full border px-4 font-mono text-[13px] text-[#F4F5F7] tabular-nums focus:outline-none"
                  />
                </div>
              </div>

              {/* Standalone Windows Executable (.exe) Download Card */}
              <div className="lg-surface flex flex-col justify-between gap-3 rounded-[20px] border p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13.5px] font-semibold text-[#F4F5F7]">
                      Standalone Windows App (wristport.exe)
                    </h3>
                    <span className="lg-pill rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#B8CEFF]">
                      84 MB · Win x64
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#9BA1B2]">
                    Run wristport locally on your Windows PC with zero dependencies and built-in SDB sideloading.
                  </p>
                </div>

                <a
                  href="/download-exe"
                  target="_blank"
                  rel="noreferrer"
                  className="lg-pill-accent inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#0A0D16] transition-all hover:brightness-105"
                >
                  <M3Icon name="download" size={16} />
                  <span>Download .exe</span>
                </a>
              </div>
            </div>
          )}

          {tab === 'themes' && (
            <ThemeSettingsPanel
              theme={activeTheme}
              onChangeTheme={(nextTheme) => updateTheme(nextTheme)}
            />
          )}

          {tab === 'certs' && (
            <div className="space-y-4">
              <p className="text-[13px] leading-relaxed text-[#9BA1B2]">
                Signed packages from <code className="text-[#B8CEFF]">tizen-archive.com</code> install directly via <code className="text-[#B8CEFF]">pkgcmd -i -w</code>. Store optional local certificate paths below in <code className="text-[#D8DDE9]">config.json</code>.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#9BA1B2]">
                  Author Certificate (.p12)
                </label>
                <input
                  type="text"
                  value={draft.authorCertPath}
                  onChange={(e) => setDraft({ ...draft, authorCertPath: e.target.value })}
                  placeholder="C:\Users\you\SamsungCertificate\author.p12"
                  className="lg-input h-10 w-full rounded-full border px-4 font-mono text-[12.5px] text-[#F4F5F7] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#9BA1B2]">
                  Distributor Certificate (.p12)
                </label>
                <input
                  type="text"
                  value={draft.distributorCertPath}
                  onChange={(e) =>
                    setDraft({ ...draft, distributorCertPath: e.target.value })
                  }
                  placeholder="C:\Users\you\SamsungCertificate\distributor.p12"
                  className="lg-input h-10 w-full rounded-full border px-4 font-mono text-[12.5px] text-[#F4F5F7] focus:outline-none"
                />
              </div>
            </div>
          )}

          {tab === 'guide' && (
            <div className="space-y-3">
              {[
                {
                  step: '01',
                  title: 'Force Wi-Fi Always On',
                  desc: 'On your Galaxy Watch, open Settings > Connections > Wi-Fi and switch it to Always On, connected to the same Wi-Fi network as your PC.',
                },
                {
                  step: '02',
                  title: 'Enable Developer Options & Debug over Wi-Fi',
                  desc: 'Open Settings > About watch > Debugging (or Developer options > Debugging + Debug over Wi-Fi) and reboot the watch once.',
                },
                {
                  step: '03',
                  title: 'Let Port 26101 Scan Find It — Or Enter Last Digits',
                  desc: 'wristport automatically runs sdb devices and probes TCP port 26101 across your subnet. If none respond, just enter the trailing digits (e.g. 69 for 192.168.1.69).',
                },
                {
                  step: '04',
                  title: 'Accept RSA Debugging Prompt',
                  desc: 'When sdb connect runs for the first time, tap Always allow on the RSA key popup on your watch screen.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="lg-surface flex gap-3.5 rounded-[18px] border p-4"
                >
                  <span className="font-mono text-[12px] font-bold text-[#B8CEFF] tabular-nums">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-[#F4F5F7]">{item.title}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#9BA1B2]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.04] px-6 py-4">
          <div className="text-[12px] text-[#4ADE80]">
            {savedToast && (
              <span className="inline-flex items-center gap-1.5">
                <M3Icon name="check_circle" size={16} />
                <span>Saved to config.json</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="lg-pill rounded-full px-5 py-2 text-[13px] font-medium text-[#B8CEFF]"
            >
              Close
            </button>
            {(tab === 'sdb' || tab === 'themes' || tab === 'certs') && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="lg-pill-accent rounded-full px-5 py-2 text-[13px] font-semibold text-[#0A0D16] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save config.json'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
