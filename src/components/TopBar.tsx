import { useEffect, useRef, useState } from 'react';
import { M3Icon } from './M3Icon';
import type { SidebarTab, WatchDevice } from '../types';

interface TopBarProps {
  activeTab: SidebarTab;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  watch: WatchDevice | null;
  onOpenConnect: () => void;
  onDisconnect: () => void;
  onOpenActivity: () => void;
  onOpenCustomize: () => void;
  onOpenMobileMenu: () => void;
  profileName?: string;
  profileAvatar?: string;
}

const TAB_LABELS: Record<SidebarTab, string> = {
  discover: 'Discover',
  apps: 'Apps',
  installed: 'Installed',
  customize: 'Customize App',
  activity: 'Activity',
};

export function TopBar({
  activeTab,
  searchQuery,
  onSearchChange,
  watch,
  onOpenConnect,
  onDisconnect,
  onOpenActivity,
  onOpenCustomize,
  onOpenMobileMenu,
  profileName = 'Watch enthusiast',
  profileAvatar = '',
}: TopBarProps) {
  const displayName = profileName.trim() || 'Watch enthusiast';
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'W';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-30 shrink-0 px-3 pt-3 sm:px-6 lg:px-8">
      <header className="lg-topbar mx-auto flex h-14 w-full max-w-[1220px] items-center justify-between gap-4 rounded-[20px] border px-4 sm:px-5">
        {/* Left: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg-pill rounded-full p-2 text-[#9BA1B2] hover:text-[#F4F5F7] lg:hidden"
          aria-label="Open navigation"
        >
          <M3Icon name="menu" size={18} />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] whitespace-nowrap">
          <span className="text-[#868DA0]">Library</span>
          <span className="text-[#565D70]">/</span>
          <span className="font-medium text-[#F4F5F7]">{TAB_LABELS[activeTab]}</span>
        </nav>
      </div>

      {/* Center: Liquid Glass Stadium Pill Search Bar */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <M3Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#868DA0]"
        />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Tizen apps and watch faces"
          aria-label="Search Tizen apps and watch faces"
          className="lg-input h-10 w-full rounded-full border pl-11 pr-14 text-[13px] text-[#F4F5F7] placeholder:text-[#7E8598] transition-all focus:outline-none"
        />
        <kbd className="lg-pill pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium text-[#A4ACC0]">
          ⌘K
        </kbd>
      </div>

      {/* Right: Stadium Glass Pill Connection Dropdown + W Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="lg-pill flex h-9.5 items-center gap-2 rounded-full px-4 text-[12.5px] font-medium text-[#EBF0FA] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF] whitespace-nowrap"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                watch
                  ? 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.65)]'
                  : 'bg-[#E05A5A] shadow-[0_0_8px_rgba(224,90,90,0.55)]'
              }`}
            />
            <span>{watch ? `Connected · ${watch.ip}` : 'Not connected'}</span>
            <M3Icon name="expand_more" size={17} className="text-[#9BA1B2]" />
          </button>

          {dropdownOpen && (
            <div className="lg-surface-elevated absolute right-0 mt-2 w-64 rounded-[20px] border p-2">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#868DA0]">
                  SDB Target
                </p>
                <p className="mt-0.5 text-[12.5px] font-medium text-[#F4F5F7]">
                  {watch ? `${watch.name} (Tizen ${watch.tizenVersion})` : 'No watch linked'}
                </p>
                {watch && (
                  <p className="font-mono text-[11.5px] text-[#9BA1B2] tabular-nums">
                    {watch.ip}:{watch.port}
                  </p>
                )}
              </div>

              <div className="space-y-1 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenConnect();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-[12.5px] text-[#E4E7F0] transition-colors hover:bg-white/10"
                >
                  <M3Icon name="wifi" size={17} className="text-[#B8CEFF]" />
                  <span>{watch ? 'Switch watch IP...' : 'Connect your watch...'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenActivity();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-[12.5px] text-[#E4E7F0] transition-colors hover:bg-white/10"
                >
                  <M3Icon name="terminal" size={17} className="text-[#9BA1B2]" />
                  <span>Open SDB verbose console</span>
                </button>

                {watch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onDisconnect();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-[12.5px] text-[#F58585] transition-colors hover:bg-[#E05A5A]/15"
                  >
                    <M3Icon name="link_off" size={17} />
                    <span>Disconnect watch</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenCustomize}
          title={`${displayName} · Edit profile`}
          aria-label={`${displayName} profile`}
          className="lg-orb flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[13px] font-bold text-[#B8CEFF] transition-all hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
        >
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            avatarInitial
          )}
        </button>
      </div>
      </header>
    </div>
  );
}
