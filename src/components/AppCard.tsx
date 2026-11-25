import { AppIconArtwork } from './AppIconArtwork';
import { M3Icon } from './M3Icon';
import type { TizenApp } from '../types';

interface AppCardProps {
  app: TizenApp;
  isInstalled: boolean;
  onSelect: (app: TizenApp) => void;
}

export function AppCard({ app, isInstalled, onSelect }: AppCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(app)}
      className="lg-card group flex flex-col overflow-hidden rounded-[20px] border text-left hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
    >
      {/* Refractive gradient glass header area with centered icon or real tizen-archive.com icon */}
      <div
        className="relative flex h-36 w-full items-center justify-center overflow-hidden border-b border-white/10"
        style={{
          background: `radial-gradient(circle at 70% 25%, ${app.accentColor}38 0%, transparent 62%), linear-gradient(145deg, ${app.gradientFrom}99 0%, ${app.gradientTo}aa 100%)`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />

        <span className="lg-pill absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-[#EDF2FF]">
          {app.category}
        </span>

        {isInstalled && (
          <span
            title="Installed on watch"
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#4ADE80]/40 bg-[#0D1A14]/65 px-2.5 py-0.5 text-[10.5px] font-medium text-[#6EE7B7] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          >
            <M3Icon name="check" size={13} />
            <span>Installed</span>
          </span>
        )}

        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-black/25 shadow-[0_10px_24px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-105">
          {app.iconUrl ? (
            <img
              src={app.iconUrl}
              alt={app.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <AppIconArtwork iconKey={app.iconKey} accentColor={app.accentColor} size={42} />
          )}
        </div>
      </div>

      {/* Liquid glass footer displaying app title, package type (.tpk / .wgt), and file size */}
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-4">
        <div>
          <h3 className="truncate font-display text-[14.5px] font-semibold text-[#F4F5F7] group-hover:text-white">
            {app.title}
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-[#8F96AB]">{app.developer}</p>
        </div>

        <div className="flex items-center justify-between text-[12px] text-[#9BA1B2] tabular-nums">
          <span className="font-mono text-[11.5px] text-[#B8CEFF]">{app.packageType}</span>
          <span>{app.fileSize}</span>
        </div>
      </div>
    </button>
  );
}
