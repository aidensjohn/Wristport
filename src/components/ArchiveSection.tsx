import { useEffect, useRef, useState } from 'react';
import { AppCard } from './AppCard';
import { M3Icon } from './M3Icon';
import { M3WavyCircularSpinner } from './M3WavyProgress';
import type { AppCategory, InstalledApp, TizenApp } from '../types';

export type CategoryFilter = 'All apps' | AppCategory;

const FILTER_OPTIONS: CategoryFilter[] = [
  'All apps',
  'Productivity apps',
  'Watch faces',
  'Games',
  'Utilities & Tools',
];

const PAGE_BATCH = 24;

interface ArchiveSectionProps {
  apps: TizenApp[];
  installedApps: InstalledApp[];
  activeCategory: CategoryFilter;
  onCategoryChange: (cat: CategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSelectApp: (app: TizenApp) => void;
  onResetFilters: () => void;
  onSyncLiveArchive: () => void;
  isSyncingArchive: boolean;
  isLiveArchive: boolean;
  onSideloadFile: (file: File) => void;
  onPickNativePackage?: () => void;
}

export function ArchiveSection({
  apps,
  installedApps,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onSelectApp,
  onResetFilters,
  onSyncLiveArchive,
  isSyncingArchive,
  isLiveArchive,
  onSideloadFile,
  onPickNativePackage,
}: ArchiveSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_BATCH);
  const installedIds = new Set(installedApps.map((item) => item.appId));

  useEffect(() => {
    setVisibleCount(PAGE_BATCH);
  }, [activeCategory, searchQuery, apps.length]);

  const visibleApps = apps.slice(0, visibleCount);
  const hasMore = visibleCount < apps.length;

  return (
    <section id="tizen-archive" aria-label="The Tizen Archive" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#A8C0FF]">
            THE ARCHIVE
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#F4F5F7]">
            Made for your wrist <span className="text-[#A8C0FF]">✦</span>
          </h2>
          <p className="mt-1 flex items-center gap-2 text-[13.5px] text-[#9197A8]">
            {isLiveArchive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#4ADE80]" />
                <span className="tabular-nums">
                  Full live library from{' '}
                  <a
                    href="https://tizen-archive.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#A8C0FF] hover:underline"
                  >
                    tizen-archive.com
                  </a>{' '}
                  ({visibleApps.length} of {apps.length} packages)
                </span>
              </>
            ) : (
              <span>
                {isSyncingArchive
                  ? 'Loading full package library from tizen-archive.com...'
                  : 'Connect to fetch packages from tizen-archive.com'}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
              if (onPickNativePackage) {
                onPickNativePackage();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="lg-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium text-[#E4E7F0] transition-all whitespace-nowrap"
          >
            <M3Icon name="upload_file" size={16} className="text-[#B8CEFF]" />
            <span>Sideload Local .tpk / .wgt File</span>
          </button>

          <button
            type="button"
            onClick={onSyncLiveArchive}
            disabled={isSyncingArchive}
            className="lg-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium text-[#B8CEFF] transition-all disabled:opacity-70 whitespace-nowrap"
          >
            {isSyncingArchive ? (
              <M3WavyCircularSpinner size={16} />
            ) : (
              <M3Icon name="sync" size={16} />
            )}
            <span>{isSyncingArchive ? 'Fetching tizen-archive.com...' : 'Refresh Live Archive'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <M3Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[#868DA0]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tizen-archive.com..."
            aria-label="Filter archive apps"
            className="lg-input h-10 w-full rounded-full border pl-10 pr-9 text-[13px] text-[#F4F5F7] placeholder:text-[#7E8598] transition-all focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#868DA0] hover:text-[#F4F5F7]"
              aria-label="Clear search"
            >
              <M3Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter by app category"
        >
          {FILTER_OPTIONS.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onCategoryChange(category)}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF] ${
                  isActive
                    ? 'lg-pill-accent text-[#0A0D16] font-semibold'
                    : 'lg-pill text-[#A3AAC0] hover:text-[#F4F5F7]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading skeleton while initial fetch runs */}
      {isSyncingArchive && apps.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="lg-card h-[228px] animate-pulse rounded-[20px] border"
            />
          ))}
        </div>
      ) : apps.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                isInstalled={installedIds.has(app.id)}
                onSelect={onSelectApp}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_BATCH)}
                className="lg-pill-accent inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-[#0A0D16] transition-all tabular-nums"
              >
                <span>Load {Math.min(PAGE_BATCH, apps.length - visibleCount)} More</span>
                <M3Icon name="expand_more" size={18} />
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount(apps.length)}
                className="lg-pill inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[#E4E7F0] transition-all tabular-nums"
              >
                <span>Show All ({apps.length})</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="lg-surface flex flex-col items-center justify-center rounded-[20px] border px-6 py-14 text-center">
          <p className="font-display text-base font-semibold text-[#F4F5F7]">
            No matching Tizen packages found
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-[#9BA1B2]">
            Try clearing your search query, refreshing the live archive, or switching back to All apps.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onResetFilters}
              className="lg-pill rounded-full px-5 py-2 text-[12.5px] font-medium text-[#B8CEFF]"
            >
              Reset filters
            </button>
            <button
              type="button"
              onClick={onSyncLiveArchive}
              className="lg-pill rounded-full px-5 py-2 text-[12.5px] font-medium text-[#E4E7F0]"
            >
              Retry Live Fetch
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
