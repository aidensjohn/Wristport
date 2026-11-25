import { useEffect, useRef, useState } from 'react';
import { M3Icon } from './M3Icon';
import type { ActivityRecord, LogLevel, SdbLogEntry } from '../types';

interface ActivityViewProps {
  activities: ActivityRecord[];
  logs: SdbLogEntry[];
  verboseLogging: boolean;
  onToggleVerbose: (val: boolean) => void;
  onClearLogs: () => void;
  onRunCommand: (cmd: string) => void;
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  INFO: 'text-[#9197A8]',
  CMD: 'text-[#A8C0FF] font-semibold',
  SDB: 'text-[#D3D7E2]',
  VERBOSE: 'text-[#6D7385]',
  SUCCESS: 'text-[#4ADE80]',
  WARN: 'text-[#F5B971]',
  ERROR: 'text-[#E05A5A]',
};

export function ActivityView({
  activities,
  logs,
  verboseLogging,
  onToggleVerbose,
  onClearLogs,
  onRunCommand,
}: ActivityViewProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | LogLevel>('ALL');
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const visibleLogs = logs.filter((entry) => {
    if (!verboseLogging && entry.level === 'VERBOSE') return false;
    if (levelFilter !== 'ALL' && entry.level !== levelFilter) return false;
    return true;
  });

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs.length]);

  const handleCopy = async () => {
    const text = visibleLogs
      .map(
        (l) =>
          `${new Date(l.timestamp).toLocaleTimeString()} [${l.level}] ${l.message}${
            l.detail ? ` (${l.detail})` : ''
          }`
      )
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadLog = () => {
    const text = visibleLogs
      .map(
        (l) =>
          `${l.timestamp} [${l.level}] ${l.message}${l.detail ? ` | ${l.detail}` : ''}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wristport-sdb-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[#B8CEFF]">
          TELEMETRY &amp; SDB BRIDGE
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#F4F5F7]">
          Activity &amp; Verbose SDB Console
        </h1>
        <p className="mt-1 text-[13.5px] text-[#9BA1B2]">
          Real-time Smart Development Bridge stdout/stderr stream, transfers, and pkgcmd diagnostics
        </p>
      </div>

      <section className="lg-surface overflow-hidden rounded-[20px] border">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <M3Icon name="terminal" size={18} className="text-[#B8CEFF]" />
            <span className="font-display text-[13.5px] font-semibold text-[#F4F5F7]">
              Live SDB Console
            </span>
            <span className="font-mono text-[11px] text-[#868DA0] tabular-nums">
              ({visibleLogs.length} lines)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleVerbose(!verboseLogging)}
              className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-all ${
                verboseLogging
                  ? 'lg-pill-accent text-[#0A0D16] font-semibold'
                  : 'lg-pill text-[#A3AAC0]'
              }`}
            >
              Verbose: {verboseLogging ? 'ON' : 'OFF'}
            </button>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'ALL' | LogLevel)}
              aria-label="Filter console log level"
              className="lg-pill rounded-full px-3 py-1 text-[11.5px] text-[#E4E7F0] focus:border-[#A8C0FF] focus:outline-none [&>option]:bg-[#10141F]"
            >
              <option value="ALL">All levels</option>
              <option value="CMD">CMD</option>
              <option value="SDB">SDB</option>
              <option value="VERBOSE">VERBOSE</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>

            <button
              type="button"
              onClick={handleCopy}
              className="lg-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] text-[#D8DDE9]"
            >
              <M3Icon name="content_copy" size={14} />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadLog}
              className="lg-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] text-[#D8DDE9]"
            >
              <M3Icon name="download" size={14} />
              <span>.log</span>
            </button>

            <button
              type="button"
              onClick={onClearLogs}
              className="lg-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] text-[#A3AAC0] hover:text-[#F58585]"
            >
              <M3Icon name="delete_sweep" size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Log lines */}
        <div className="lg-inset h-80 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
          {visibleLogs.length === 0 ? (
            <p className="text-[#7D8498]">No log entries matching the current filter.</p>
          ) : (
            <div className="space-y-1.5">
              {visibleLogs.map((entry) => {
                const time = new Date(entry.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                return (
                  <div key={entry.id} className="flex items-start gap-2.5">
                    <span className="shrink-0 text-[#666E82] tabular-nums">{time}</span>
                    <span className={`w-16 shrink-0 ${LEVEL_STYLES[entry.level]}`}>
                      [{entry.level}]
                    </span>
                    <span className="break-all text-[#E4E7F0]">
                      {entry.message}
                      {entry.detail && (
                        <span className="ml-2 text-[#8890A4]">— {entry.detail}</span>
                      )}
                    </span>
                  </div>
                );
              })}
              <div ref={consoleEndRef} />
            </div>
          )}
        </div>

        {/* Interactive SDB command bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!commandInput.trim()) return;
            onRunCommand(commandInput.trim());
            setCommandInput('');
          }}
          className="flex items-center gap-2 border-t border-white/10 bg-white/[0.04] px-4 py-2.5"
        >
          <span className="font-mono text-[12px] font-semibold text-[#B8CEFF]">$</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Run SDB command (e.g. sdb devices, sdb capability, sdb shell df -h, help)"
            className="flex-1 bg-transparent font-mono text-[12.5px] text-[#F4F5F7] placeholder:text-[#6B7387] focus:outline-none"
          />
          <button
            type="submit"
            className="lg-pill-accent inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold text-[#0A0D16]"
          >
            <M3Icon name="send" size={14} />
            <span>Run</span>
          </button>
        </form>
      </section>

      {/* Recent Operations */}
      <section className="space-y-3">
        <h2 className="font-display text-[16px] font-semibold text-[#F4F5F7]">
          Recent Operations
        </h2>
        {activities.length === 0 ? (
          <div className="lg-surface rounded-[20px] border p-8 text-center text-[13px] text-[#9BA1B2]">
            No installs, scans, or exports recorded yet in this session.
          </div>
        ) : (
          <div className="lg-surface divide-y divide-white/10 overflow-hidden rounded-[20px] border">
            {activities.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 text-[13px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <M3Icon
                    name={item.status === 'success' ? 'check_circle' : 'error'}
                    filled
                    size={18}
                    className={
                      item.status === 'success' ? 'text-[#4ADE80]' : 'text-[#E05A5A]'
                    }
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#F4F5F7]">{item.title}</p>
                    <p className="truncate font-mono text-[11.5px] text-[#868DA0]">
                      {item.target}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono text-[11.5px] text-[#9BA1B2] tabular-nums">
                  <div>{item.durationMs}ms</div>
                  <div className="text-[10.5px] text-[#6E758A]">
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
