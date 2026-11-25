import { M3Icon } from './M3Icon';
import type { SettingsTab } from './SettingsSdbModal';
import type { SidebarTab, WatchDevice } from '../types';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  appsCount?: number;
  installedCount: number;
  watch: WatchDevice | null;
  onOpenConnect: () => void;
  onOpenSettings: (initialTab?: SettingsTab) => void;
  isInstalling: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  profileName?: string;
  profileAvatar?: string;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  appsCount = 0,
  installedCount,
  watch,
  onOpenConnect,
  onOpenSettings,
  isInstalling,
  mobileOpen,
  onCloseMobile,
  profileName = 'Watch enthusiast',
  profileAvatar = '',
}: SidebarProps) {
  const displayName = profileName.trim() || 'Watch enthusiast';
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'W';
  const navItems: { id: SidebarTab; label: string; icon: string; badge?: number }[] = [
    { id: 'discover', label: 'Discover', icon: 'explore' },
    {
      id: 'apps',
      label: 'Apps',
      icon: 'apps',
      badge: appsCount > 0 ? appsCount : undefined,
    },
    { id: 'installed', label: 'Installed', icon: 'layers', badge: installedCount },
    { id: 'customize', label: 'Customize App', icon: 'tune' },
    { id: 'activity', label: 'Activity', icon: 'monitoring' },
  ];

  const sidebarContent = (
    <aside className="lg-sidebar relative z-10 flex h-full w-[248px] shrink-0 flex-col overflow-hidden rounded-[24px] border select-none">
      <div className="my-3.5 mr-1.5 flex-1 overflow-y-auto pl-3.5 pr-2 py-0.5">
        <div className="flex min-h-full flex-col justify-between">
          <div className="space-y-6">
            {/* Brand Header */}
            <div className="flex items-center justify-between px-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => onSelectTab('discover')}
                className="flex items-center gap-2.5 rounded-[16px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
              >
                <div className="lg-pill-accent flex h-9 w-9 items-center justify-center rounded-[12px] text-[#0E1015]">
                  <M3Icon name="watch" filled size={20} />
                </div>
                <span className="font-display text-[18px] font-bold tracking-tight text-[#F4F5F7]">
                  wristport
                </span>
              </button>

              <button
                type="button"
                onClick={onCloseMobile}
                className="lg-pill rounded-full p-1.5 text-[#9197A8] hover:text-[#F4F5F7] lg:hidden"
                aria-label="Close navigation"
              >
                <M3Icon name="close" size={18} />
              </button>
            </div>

            {/* LIBRARY Navigation Section (16px nav drawer pills) */}
            <div className="space-y-1.5">
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.1em] text-[#7D8498]">
                LIBRARY
              </p>
              <nav className="space-y-1" aria-label="Library Navigation">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-[13.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF] ${
                        isActive
                          ? 'lg-nav-active text-[#F4F7FF]'
                          : 'border border-transparent text-[#9BA1B2] hover:border-white/10 hover:bg-white/[0.06] hover:text-[#F4F5F7]'
                      }`}
                    >
                      <span className="flex items-center gap-3 whitespace-nowrap">
                        <M3Icon
                          name={item.icon}
                          filled={isActive}
                          size={19}
                          className={isActive ? 'text-[#B8CEFF]' : 'text-[#7F8699]'}
                        />
                        <span>{item.label}</span>
                      </span>

                      {typeof item.badge === 'number' && (
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                            isActive
                              ? 'lg-pill-accent text-[#0E1015]'
                              : 'lg-pill text-[#9FA6B8]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.id === 'activity' && isInstalling && (
                        <span className="h-2 w-2 rounded-full bg-[#A8C0FF] animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* YOUR WATCH Card (20px liquid glass container) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <p className="text-[11px] font-semibold tracking-[0.1em] text-[#7D8498]">
                  YOUR WATCH
                </p>
                {watch && (
                  <div className="flex items-center gap-1 font-mono text-[10.5px] font-semibold text-[#4ADE80]">
                    <M3Icon name="battery_full" size={14} className="text-[#4ADE80]" />
                    <span className="tabular-nums">{watch.batteryPercent ?? 88}%</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onOpenConnect();
                  onCloseMobile();
                }}
                className="lg-card group w-full rounded-[20px] border p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border ${
                        watch
                          ? 'border-[#4ADE80]/35 bg-[#4ADE80]/15 text-[#4ADE80] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                          : 'lg-orb text-[#9BA1B2]'
                      }`}
                    >
                      <M3Icon name="watch" filled={Boolean(watch)} size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#F4F5F7]">
                        {watch ? watch.name : 'No watch connected'}
                      </p>
                      <p className="truncate text-[11.5px] text-[#9BA1B2] tabular-nums">
                        {watch ? watch.serial : 'Discover or enter IP digits'}
                      </p>
                    </div>
                  </div>
                  <M3Icon
                    name="expand_more"
                    size={18}
                    className="mt-1 shrink-0 text-[#7D8498] transition-colors group-hover:text-[#B8CEFF]"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Utility Area */}
          <div className="space-y-2.5 pt-4">
            <button
              type="button"
              onClick={() => {
                onOpenSettings('sdb');
                onCloseMobile();
              }}
              className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-3 py-2.5 text-[13px] font-medium text-[#9BA1B2] transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-[#F4F5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
            >
              <M3Icon name="settings" size={18} className="text-[#7F8699]" />
              <span>Settings &amp; SDB</span>
            </button>

            <div className="lg-pill flex items-center justify-between rounded-full px-2.5 py-2">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('customize');
                  onCloseMobile();
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
                title="Customize profile & appearance"
              >
                <div className="lg-orb flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[12px] font-bold text-[#B8CEFF]">
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt={displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    avatarInitial
                  )}
                </div>
                <span className="truncate text-[12.5px] font-medium text-[#E4E7F0]">
                  {displayName}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenSettings('guide');
                  onCloseMobile();
                }}
                className="lg-orb flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[#9BA1B2] transition-all hover:border-[#A8C0FF]/45 hover:bg-white/12 hover:text-[#F4F5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF]"
                title="Wi-Fi debugging guide &amp; help"
                aria-label="Wi-Fi debugging guide &amp; help"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="relative z-20 hidden h-full shrink-0 py-3 pl-3 lg:block">
        {sidebarContent}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full py-3 pl-3">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
