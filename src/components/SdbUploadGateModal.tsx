import { useRef, useState } from 'react';
import { M3Icon } from './M3Icon';
import { M3WavyLinearProgress } from './M3WavyProgress';
import type { SdbWorkspaceStatus } from '../types';

interface SdbUploadGateModalProps {
  open: boolean;
  workspace: SdbWorkspaceStatus | null;
  onUploaded: (status: SdbWorkspaceStatus) => Promise<void>;
  onClose: () => void;
}

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

export function SdbUploadGateModal({
  open,
  workspace,
  onUploaded,
  onClose,
}: SdbUploadGateModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const processFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const fileBase64 = arrayBufferToBase64(buf);
      const res = await fetch('/api/sdb/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save SDB file in workspace.');
      }
      await onUploaded(data.workspace as SdbWorkspaceStatus);
    } catch (err) {
      setError((err as Error).message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sdb-gate-title"
    >
      <div className="lg-surface-elevated w-full max-w-xl overflow-hidden rounded-[26px] border p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="lg-orb flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border text-[#B8CEFF]">
              <M3Icon name="upload_file" filled size={24} />
            </div>
            <div>
              <h2
                id="sdb-gate-title"
                className="font-display text-[19px] font-bold tracking-tight text-[#F4F5F7]"
              >
                Add SDB to connect your watch
              </h2>
              <p className="text-[12.5px] text-[#9BA1B2]">
                Stage <code className="text-[#B8CEFF]">sdb.exe</code> or <code className="text-[#B8CEFF]">sdb</code> into your wristport workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg-pill rounded-full p-1.5 text-[#9BA1B2] hover:text-[#F4F5F7]"
            aria-label="Close SDB setup modal"
          >
            <M3Icon name="close" size={18} />
          </button>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-[#CFD4E0]">
          Select your <code className="font-mono text-[#B8CEFF]">sdb.exe</code> (Windows),{' '}
          <code className="font-mono text-[#B8CEFF]">sdb</code> (Linux/macOS), or Tizen CLI{' '}
          <code className="font-mono text-[#B8CEFF]">.zip</code> package to discover your Galaxy Watch over Wi-Fi on port{' '}
          <code className="font-mono text-[#D8DDE9]">26101</code> and install{' '}
          <code className="font-mono text-[#D8DDE9]">.tpk</code> /{' '}
          <code className="font-mono text-[#D8DDE9]">.wgt</code> apps directly.
        </p>

        {/* Dropzone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".exe,.zip,.dll,*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void processFile(f);
            e.target.value = '';
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void processFile(f);
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-5 py-7 text-center transition-all ${
            dragActive
              ? 'border-[#B8CEFF] bg-[#A8C0FF]/16 backdrop-blur-md'
              : 'lg-inset hover:border-[#B8CEFF]/60'
          }`}
        >
          <M3Icon
            name={workspace?.uploaded ? 'check_circle' : 'terminal'}
            filled={Boolean(workspace?.uploaded)}
            size={30}
            className={workspace?.uploaded ? 'text-[#4ADE80]' : 'text-[#B8CEFF]'}
          />
          <p className="mt-2.5 font-display text-[14px] font-semibold text-[#F4F5F7]">
            {uploading
              ? 'Staging SDB binary into workspace...'
              : workspace?.uploaded
              ? `Ready: ${workspace.binaryName} (${Math.round(workspace.binarySizeBytes / 1024)} KB)`
              : 'Drop sdb.exe, sdb, or Tizen CLI .zip here — or click to browse'}
          </p>
          <p className="mt-1 text-[12px] text-[#8E95AA]">
            Saved inside wristport_data/bin/ (include mgwz.dll / AdbWinApi.dll via .zip if needed)
          </p>
        </div>

        {uploading && (
          <div className="mt-4">
            <M3WavyLinearProgress
              value={72}
              label="Saving SDB executable & verifying binary header..."
            />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[16px] border border-[#E05A5A]/40 bg-[#E05A5A]/15 px-4 py-3 text-[12.5px] text-[#F8B4B4] backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Current Staged Binary Status */}
        {workspace?.uploaded && (
          <div className="lg-inset mt-4 space-y-2 rounded-[18px] border p-4 font-mono text-[11.5px]">
            <div className="flex items-center justify-between text-[#E4E7F0]">
              <span>Workspace File: {workspace.binaryName}</span>
              <span className="text-[#B8CEFF]">{workspace.binaryFormat}</span>
            </div>
            {workspace.sdbVersion && (
              <p className="text-[#4ADE80]">Verified: {workspace.sdbVersion}</p>
            )}
            {workspace.error && (
              <p className="font-sans text-[12.5px] leading-relaxed text-[#F5B971]">
                {workspace.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          {!workspace?.uploaded && (
            <button
              type="button"
              onClick={onClose}
              className="lg-pill rounded-full px-5 py-2 text-[13px] font-medium text-[#A3AAC0] hover:text-[#F4F5F7]"
            >
              Skip for now
            </button>
          )}

          {workspace?.uploaded ? (
            <button
              type="button"
              onClick={onClose}
              className="lg-pill-accent rounded-full px-5 py-2 text-[13px] font-semibold text-[#0A0D16]"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="lg-pill-accent rounded-full px-5 py-2 text-[13px] font-semibold text-[#0A0D16] disabled:opacity-60"
            >
              Select sdb.exe...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
