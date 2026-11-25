import { useEffect, useRef, useState } from 'react';
import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner } from './M3WavyProgress';
import type { DiscoveredWatch, SdbWorkspaceStatus, WatchDevice, WatchDiscoveryResult } from '../types';

interface ConnectWatchModalProps {
  open: boolean;
  watch: WatchDevice | null;
  workspace: SdbWorkspaceStatus | null;
  defaultPort: number;
  subnetPrefix: string;
  lastIpOctet?: string;
  scanStatusNote?: string | null;
  onClose: () => void;
  onConnect: (payload: {
    ip?: string;
    octet?: string;
    subnetPrefix?: string;
    port: number;
  }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onDiscoverWatches: () => Promise<WatchDiscoveryResult>;
  onOpenUploadSdb: () => void;
}

export function ConnectWatchModal({
  open,
  watch,
  workspace,
  defaultPort,
  subnetPrefix,
  lastIpOctet = '',
  scanStatusNote,
  onClose,
  onConnect,
  onDisconnect,
  onDiscoverWatches,
  onOpenUploadSdb,
}: ConnectWatchModalProps) {
  const [octet, setOctet] = useState(lastIpOctet || '');
  const [prefix, setPrefix] = useState(subnetPrefix || '192.168.1');
  const [editPrefix, setEditPrefix] = useState(false);
  const [port, setPort] = useState(String(watch?.port || defaultPort || 26101));
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredWatch[]>([]);
  const [note, setNote] = useState<string | null>(scanStatusNote || null);
  const [error, setError] = useState<string | null>(null);
  const octetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setNote(scanStatusNote || null);
      setPrefix(subnetPrefix || '192.168.1');
      setTimeout(() => octetInputRef.current?.focus(), 40);
    }
  }, [open, scanStatusNote, subnetPrefix]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.uploaded) {
      onClose();
      onOpenUploadSdb();
      return;
    }
    const cleanDigits = octet.replace(/\D/g, '');
    if (!cleanDigits || Number(cleanDigits) > 255) {
      setError('Enter the last digits of your watch IP (0–255, e.g. 69).');
      return;
    }
    setError(null);
    setConnecting(true);
    try {
      const parsedPort = Number(port) || 26101;
      await onConnect({
        octet: cleanDigits,
        subnetPrefix: prefix.trim() || '192.168.1',
        port: parsedPort,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to connect via SDB.');
    } finally {
      setConnecting(false);
    }
  };

  const handleScan = async () => {
    if (!workspace?.uploaded) {
      onClose();
      onOpenUploadSdb();
      return;
    }
    setError(null);
    setNote(null);
    setScanning(true);
    try {
      const result = await onDiscoverWatches();
      setDiscovered(result.devices);
      if (result.connectedWatch) {
        onClose();
      } else {
        setNote(
          result.reason ||
            'No watches responded to sdb devices or port 26101 scan. Enter the last digits of your watch IP below.'
        );
      }
    } catch (err) {
      setError((err as Error).message || 'Discovery failed.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-watch-title"
    >
      <div className="lg-surface-elevated w-full max-w-md overflow-hidden rounded-[24px] border p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="lg-orb flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border text-[#B8CEFF]">
              <M3Icon name="watch" filled size={24} />
            </div>
            <div>
              <h2
                id="connect-watch-title"
                className="font-display text-[19px] font-bold tracking-tight text-[#F4F5F7]"
              >
                Connect your watch
              </h2>
              <p className="text-[12px] text-[#9BA1B2]">Real SDB over Wi-Fi (port {port})</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg-pill rounded-full p-1.5 text-[#9BA1B2] hover:text-[#F4F5F7]"
            aria-label="Close modal"
          >
            <M3Icon name="close" size={18} />
          </button>
        </div>

        {/* Instructions highlighting ONLY entering the last digits */}
        <p className="mt-4 text-[13.5px] leading-relaxed text-[#CFD4E0]">
          Enter <strong className="text-[#F4F5F7]">only the last digits</strong> of your watch&apos;s
          IP (<span className="font-mono text-[#B8CEFF]">{prefix}.__</span>). Enable{' '}
          <strong className="text-[#F4F5F7]">Developer options &gt; Debugging</strong> +{' '}
          <strong className="text-[#F4F5F7]">Debug over Wi-Fi</strong> on your Galaxy Watch first.
        </p>

        {note && !watch && (
          <div className="mt-4 rounded-[16px] border border-[#F5B971]/40 bg-[#F5B971]/12 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#FBE0B4] backdrop-blur-md">
            {note}
          </div>
        )}

        {watch && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[#4ADE80]/35 bg-[#4ADE80]/12 px-3.5 py-2.5 backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#F4F5F7]">
                {watch.name}
              </p>
              <p className="font-mono text-[11.5px] text-[#9DE8B4] tabular-nums">
                Connected · {watch.serial} · Tizen {watch.tizenVersion}
              </p>
            </div>
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-full border border-[#E05A5A]/40 bg-[#E05A5A]/15 px-3 py-1 text-[11.5px] font-medium text-[#F58585] hover:bg-[#E05A5A]/25"
            >
              Disconnect
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[16px] border border-[#E05A5A]/40 bg-[#E05A5A]/15 px-3.5 py-2.5 text-[12.5px] text-[#F8B4B4] backdrop-blur-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <label htmlFor="watch-octet-input" className="font-medium text-[#9BA1B2]">
                Last Digits of Watch IP
              </label>
              <button
                type="button"
                onClick={() => setEditPrefix((p) => !p)}
                className="font-medium text-[#B8CEFF] hover:underline"
              >
                {editPrefix ? 'Lock subnet prefix' : 'Change subnet / port'}
              </button>
            </div>

            <div className="lg-input flex h-12 items-center overflow-hidden rounded-[16px] border px-4">
              <span className="font-mono text-[15px] text-[#8D94A8] select-none">
                {prefix}.
              </span>
              <input
                ref={octetInputRef}
                id="watch-octet-input"
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={octet}
                onChange={(e) => setOctet(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="69"
                className="w-full bg-transparent pl-1 font-mono text-[17px] font-semibold text-[#F4F5F7] placeholder:text-[#5F667A] focus:outline-none tabular-nums"
              />
              <span className="font-mono text-[12px] text-[#7D8498]">:{port}</span>
            </div>
          </div>

          {editPrefix && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="block text-[11.5px] text-[#9BA1B2]">Subnet Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="192.168.1"
                  className="lg-input h-10 w-full rounded-[14px] border px-3 font-mono text-[13px] text-[#F4F5F7] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11.5px] text-[#9BA1B2]">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="lg-input h-10 w-full rounded-[14px] border px-3 font-mono text-[13px] text-[#F4F5F7] tabular-nums focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 font-medium text-[#B8CEFF] hover:underline"
            >
              {scanning ? (
                <M3WavyCircularSpinner size={14} />
              ) : (
                <M3Icon name="radar" size={15} />
              )}
              <span>
                {scanning
                  ? 'Running sdb devices & port 26101 scan...'
                  : 'Re-scan sdb + port 26101'}
              </span>
            </button>

            {workspace?.uploaded && (
              <span className="font-mono text-[11px] text-[#868DA0]">
                {workspace.binaryName}
              </span>
            )}
          </div>

          {discovered.length > 0 && (
            <div className="lg-inset space-y-1.5 rounded-[16px] border p-2.5">
              {discovered.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    const parts = d.ip.split('.');
                    if (parts.length === 4) {
                      setPrefix(`${parts[0]}.${parts[1]}.${parts[2]}`);
                      setOctet(parts[3]);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-[12px] px-2.5 py-1.5 text-left text-[12px] hover:bg-white/10"
                >
                  <span className="font-medium text-[#F4F5F7]">
                    {d.name} · Tizen {d.tizenVersion}
                  </span>
                  <span className="font-mono text-[#B8CEFF] tabular-nums">
                    {d.ip}:{d.port}
                  </span>
                </button>
              ))}
            </div>
          )}

          {connecting && (
            <div className="lg-surface flex items-center gap-3 rounded-[16px] border px-4 py-3">
              <M3WavyCircularSpinner size={24} />
              <div className="text-[12.5px]">
                <p className="font-medium text-[#F4F5F7]">Running real sdb connect...</p>
                <p className="text-[#9BA1B2]">
                  Tap &ldquo;Always allow&rdquo; if your watch prompts for an RSA key.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="lg-pill rounded-full px-5 py-2.5 text-[13.5px] font-medium text-[#B8CEFF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="lg-pill-accent rounded-full px-6 py-2.5 text-[13.5px] font-semibold text-[#0A0D16] transition-all disabled:opacity-60"
            >
              {connecting ? 'Connecting...' : 'Connect Watch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
