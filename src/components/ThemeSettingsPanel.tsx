import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { FlatWatchFrame, WatchStrapPreviewSvg } from './FlatWatchFrame';
import { M3Icon } from './M3Icon';
import {
  APP_FONT_OPTIONS,
  CATPPUCCIN_ACCENT_META,
  CATPPUCCIN_FLAVORS,
  DEFAULT_THEME_CONFIG,
  HERO_WATCH_OPTIONS,
  MATERIAL3_OPTIONS,
  WATCH_STRAP_OPTIONS,
  ZORIN_OPTIONS,
  resolveEffectiveThemeMode,
} from '../themes/themeRegistry';
import type { ThemeConfig, ThemeFamily, ThemeMode } from '../types';

interface ThemeSettingsPanelProps {
  theme?: ThemeConfig;
  onChangeTheme: (next: ThemeConfig) => void;
}

function cropAvatarToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = Math.max(0, (img.width - side) / 2);
        const sy = Math.max(0, (img.height - side) / 2);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/webp', 0.88));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function ThemeSettingsPanel({
  theme,
  onChangeTheme,
}: ThemeSettingsPanelProps) {
  const activeTheme: ThemeConfig = {
    ...DEFAULT_THEME_CONFIG,
    ...theme,
  };
  const effectiveMode = resolveEffectiveThemeMode(activeTheme);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const updateTheme = (patch: Partial<ThemeConfig>) => {
    const nextTheme: ThemeConfig = {
      ...activeTheme,
      ...patch,
    };
    onChangeTheme(nextTheme);
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarError(null);
    try {
      const dataUrl = await cropAvatarToSquareDataUrl(file);
      updateTheme({ profileAvatar: dataUrl });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to load profile photo.');
    }
  };

  const displayName = activeTheme.profileName?.trim() || 'Watch enthusiast';
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'W';

  const handleGlobalModeChange = (nextMode: ThemeMode) => {
    const patch: Partial<ThemeConfig> = {
      mode: nextMode,
      zorinMode: nextMode,
    };
    if (nextMode === 'light') {
      patch.catppuccinFlavor = 'latte';
    } else if (activeTheme.catppuccinFlavor === 'latte') {
      patch.catppuccinFlavor = 'mocha';
    }
    updateTheme(patch);
  };

  const themeFamilies: Array<{
    id: ThemeFamily;
    name: string;
    subtitle: string;
    badge?: string;
    swatches: string[];
  }> = [
    {
      id: 'zorin',
      name: 'Zorin OS',
      subtitle: 'Clean Scandinavian desktop styling in Dark & Light modes',
      badge: 'Default',
      swatches: ['#15A6F0', '#11161D', '#EEF3F8'],
    },
    {
      id: 'liquid-glass',
      name: 'Liquid Glass',
      subtitle: 'Refractive clear optical bezel in obsidian Dark or daylight Light',
      swatches:
        effectiveMode === 'light'
          ? ['#EEF3FA', '#2563EB', '#0F172A']
          : ['#05070D', '#A8C0FF', '#F4F5F7'],
    },
    {
      id: 'material3',
      name: 'Material UI 3',
      subtitle: '5 tonal dynamic color palettes in both Dark and Light modes',
      swatches: MATERIAL3_OPTIONS.map((o) =>
        effectiveMode === 'light' ? o.light.accent : o.dark.accent
      ),
    },
    {
      id: 'catppuccin',
      name: 'Catppuccin',
      subtitle: 'Soothing pastel palette across all 4 flavors & 14 colors',
      swatches: [
        CATPPUCCIN_FLAVORS[
          effectiveMode === 'light'
            ? 'latte'
            : activeTheme.catppuccinFlavor === 'latte'
            ? 'mocha'
            : activeTheme.catppuccinFlavor
        ].base,
        CATPPUCCIN_FLAVORS[activeTheme.catppuccinFlavor].accents.mauve,
        CATPPUCCIN_FLAVORS[activeTheme.catppuccinFlavor].accents.teal,
        CATPPUCCIN_FLAVORS[activeTheme.catppuccinFlavor].accents.peach,
      ],
    },
    {
      id: 'glassmorphism',
      name: 'Glassmorphism (Frosted Glass)',
      subtitle: 'Deep 22px frosted blur cards floating over vibrant aurora mesh',
      swatches:
        effectiveMode === 'light'
          ? ['#E7EEF9', '#0284C7', '#A78BFA']
          : ['#0B1120', '#38BDF8', '#A855F7'],
    },
    {
      id: 'linear-obsidian',
      name: 'Linear / Vercel Minimal Dark',
      subtitle: 'Obsidian UI with shadowless 1px hairlines & razor-sharp contrast',
      swatches:
        effectiveMode === 'light'
          ? ['#FAFAFA', '#18181B', '#E4E4E7']
          : ['#09090B', '#EDEDEF', '#27272A'],
    },
    {
      id: 'bento-grid',
      name: 'Bento Grid (Modular Flat UI)',
      subtitle: 'Clean matte stepped modular tiles with warm tangerine accents',
      swatches:
        effectiveMode === 'light'
          ? ['#F1F2F6', '#EA580C', '#FFFFFF']
          : ['#121316', '#FF7849', '#23262E'],
    },
    {
      id: 'neo-brutalism',
      name: 'Soft Neo-Brutalism / Tactile Flat',
      subtitle: 'Crisp 2px ink borders, solid hard offset shadows & tactile pop',
      swatches:
        effectiveMode === 'light'
          ? ['#FFFDF5', '#FACC15', '#18181B']
          : ['#16161A', '#FACC15', '#F4F4F5'],
    },
  ];

  const displayedCatppuccinFlavorId =
    effectiveMode === 'light'
      ? 'latte'
      : activeTheme.catppuccinFlavor === 'latte'
      ? 'mocha'
      : activeTheme.catppuccinFlavor;
  const currentCatppuccinPalette = CATPPUCCIN_FLAVORS[displayedCatppuccinFlavorId];

  const activeSimpleStyleInfo: Partial<
    Record<ThemeFamily, { title: string; description: string }>
  > = {
    'liquid-glass': {
      title: `Liquid Glass · ${effectiveMode === 'light' ? 'Daylight Frosted Light' : 'Obsidian Dark'}`,
      description:
        effectiveMode === 'light'
          ? 'Bright translucent frosted glass surfaces with crisp slate ink.'
          : 'Clear optical bezel refraction over a lightweight obsidian backdrop.',
    },
    glassmorphism: {
      title: `Glassmorphism (Frosted Glass) · ${effectiveMode === 'light' ? 'Ice Frost' : 'Aurora Night'}`,
      description:
        'Heavy 22px frosted backdrop blur with luminous specular borders over ambient gradients.',
    },
    'linear-obsidian': {
      title: `Linear / Vercel Minimal · ${effectiveMode === 'light' ? 'Gallery Light' : 'Obsidian UI'}`,
      description:
        'Ultra-crisp 1px hairlines, shadowless precision containers, and monochrome focus.',
    },
    'bento-grid': {
      title: `Bento Grid (Modular Flat UI) · ${effectiveMode === 'light' ? 'Matte Daylight' : 'Graphite Tiles'}`,
      description:
        'Stepped tonal surfaces with clean 1.5px outlines and warm tangerine focal highlights.',
    },
    'neo-brutalism': {
      title: `Soft Neo-Brutalism / Tactile Flat · ${effectiveMode === 'light' ? 'Paper Cream' : 'Charcoal Ink'}`,
      description:
        'Bold 2px structural borders, non-blurred hard offset shadows, and crisp tactile press feedback.',
    },
  };

  const simpleDetail = activeSimpleStyleInfo[activeTheme.family];

  return (
    <div className="space-y-5">
      {/* Global Light / Dark Appearance Mode (applies across ALL themes) */}
      <div className="lg-surface flex flex-col justify-between gap-3 rounded-[20px] border p-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-[13.5px] font-semibold text-[#F4F5F7]">
            Global Appearance Mode
          </h3>
          <p className="text-[12px] text-[#9BA1B2]">
            Switches Light or Dark mode across every theme in Wristport
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => handleGlobalModeChange('dark')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-all ${
              effectiveMode === 'dark'
                ? 'lg-pill-accent font-semibold text-[#0A0D16]'
                : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
            }`}
          >
            <M3Icon name="dark_mode" filled={effectiveMode === 'dark'} size={16} />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => handleGlobalModeChange('light')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-all ${
              effectiveMode === 'light'
                ? 'lg-pill-accent font-semibold text-[#0A0D16]'
                : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
            }`}
          >
            <M3Icon name="light_mode" filled={effectiveMode === 'light'} size={16} />
            <span>Light</span>
          </button>
        </div>
      </div>

      {/* Theme Family Selector */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13.5px] font-semibold text-[#F4F5F7]">
            Choose Interface Theme ({themeFamilies.length} Styles)
          </h3>
          <span className="text-[11.5px] text-[#9BA1B2]">
            Applies live &amp; saves automatically
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {themeFamilies.map((item) => {
            const selected = activeTheme.family === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateTheme({ family: item.id })}
                className={`lg-card flex flex-col justify-between rounded-[18px] border p-4 text-left transition-all ${
                  selected ? 'lg-nav-active ring-1 ring-[#A8C0FF]/45' : ''
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[14px] font-bold text-[#F4F5F7]">
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="lg-pill rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#B8CEFF]">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-[#9BA1B2]">
                      {item.subtitle}
                    </p>
                  </div>

                  {selected && (
                    <M3Icon
                      name="check_circle"
                      filled
                      size={18}
                      className="shrink-0 text-[#B8CEFF]"
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {item.swatches.map((hex, i) => (
                    <span
                      key={`${item.id}-${hex}-${i}`}
                      className="h-3.5 w-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Simple Theme Summary */}
      {simpleDetail && (
        <div className="lg-surface flex items-center justify-between gap-3 rounded-[18px] border p-4">
          <div className="space-y-0.5">
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              {simpleDetail.title}
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">{simpleDetail.description}</p>
          </div>
          <span className="lg-pill shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-[#B8CEFF]">
            Active
          </span>
        </div>
      )}

      {/* Material UI 3 — 5 Color Options (Adapts to Light & Dark) */}
      {activeTheme.family === 'material3' && (
        <div className="lg-surface space-y-3 rounded-[20px] border p-4">
          <div>
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              Material UI 3 Color Palette (5 Options · {effectiveMode === 'light' ? 'Light' : 'Dark'})
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">
              Dynamic {effectiveMode} tonal containers adapted to your chosen primary seed color
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {MATERIAL3_OPTIONS.map((opt) => {
              const active = activeTheme.material3Color === opt.id;
              const swatchHex = effectiveMode === 'light' ? opt.light.accent : opt.dark.accent;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    updateTheme({ family: 'material3', material3Color: opt.id })
                  }
                  className={`flex items-center gap-2 rounded-[14px] border px-3 py-2.5 text-left transition-all ${
                    active
                      ? 'lg-nav-active font-semibold text-[#F4F5F7]'
                      : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-white/25"
                    style={{ backgroundColor: swatchHex }}
                  />
                  <span className="truncate text-[12.5px]">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Zorin OS — Light & Dark Options */}
      {activeTheme.family === 'zorin' && (
        <div className="lg-surface space-y-3 rounded-[20px] border p-4">
          <div>
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              Zorin OS Appearance
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">
              Switch between Zorin OS Dark and crisp Zorin OS Light desktop styling
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['dark', 'light'] as const).map((mode) => {
              const opt = ZORIN_OPTIONS[mode];
              const active = effectiveMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleGlobalModeChange(mode)}
                  className={`flex items-center justify-between rounded-[16px] border px-4 py-3 text-left transition-all ${
                    active
                      ? 'lg-nav-active font-semibold text-[#F4F5F7]'
                      : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25"
                      style={{ backgroundColor: opt.bg }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: opt.accent }}
                      />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#F4F5F7]">
                        Zorin {opt.label}
                      </p>
                      <p className="text-[11px] text-[#9BA1B2]">
                        {mode === 'light' ? 'Bright canvas' : 'Midnight slate'}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <M3Icon name="check_circle" filled size={18} className="text-[#B8CEFF]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Catppuccin — All 4 Flavors + All 14 Official Catppuccin Colors */}
      {activeTheme.family === 'catppuccin' && (
        <div className="lg-surface space-y-4 rounded-[20px] border p-4">
          <div>
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              Catppuccin Flavor
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">
              Pick any of the 4 official Catppuccin bases (Latte Light, Frappé, Macchiato, Mocha)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(['latte', 'frappe', 'macchiato', 'mocha'] as const).map((flavorId) => {
              const pal = CATPPUCCIN_FLAVORS[flavorId];
              const active = displayedCatppuccinFlavorId === flavorId;
              return (
                <button
                  key={flavorId}
                  type="button"
                  onClick={() =>
                    updateTheme({
                      family: 'catppuccin',
                      mode: pal.scheme,
                      zorinMode: pal.scheme,
                      catppuccinFlavor: flavorId,
                    })
                  }
                  className={`flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition-all ${
                    active
                      ? 'lg-nav-active font-semibold text-[#F4F5F7]'
                      : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-white/25"
                    style={{ backgroundColor: pal.base }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px]">{pal.label}</p>
                    <p className="text-[10px] opacity-75">
                      {pal.scheme === 'light' ? 'Light' : 'Dark'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              All Catppuccin Colors (14 Accents)
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {CATPPUCCIN_ACCENT_META.map((accent) => {
                const hex = currentCatppuccinPalette.accents[accent.id];
                const active = activeTheme.catppuccinAccent === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() =>
                      updateTheme({
                        family: 'catppuccin',
                        catppuccinAccent: accent.id,
                      })
                    }
                    className={`flex items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left transition-all ${
                      active
                        ? 'lg-nav-active font-semibold text-[#F4F5F7]'
                        : 'lg-pill text-[#9BA1B2] hover:text-[#F4F5F7]'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/20"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="truncate text-[12px]">{accent.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Typography & App Font Selector */}
      <div className="lg-surface space-y-3 rounded-[20px] border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              App Font &amp; Typography
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">
              Change the typeface used across headings, buttons, and body labels
            </p>
          </div>
          <M3Icon name="text_fields" size={18} className="shrink-0 text-[#B8CEFF]" />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {APP_FONT_OPTIONS.map((font) => {
            const active = activeTheme.fontFamily === font.id;
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => updateTheme({ fontFamily: font.id })}
                className={`lg-card flex flex-col justify-between rounded-[16px] border p-3.5 text-left transition-all ${
                  active ? 'lg-nav-active ring-1 ring-[#A8C0FF]/45' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-[19px] font-bold leading-none text-[#F4F5F7]"
                    style={{ fontFamily: font.displayStack }}
                  >
                    Aa Bb 12:34
                  </span>
                  {active && (
                    <M3Icon
                      name="check_circle"
                      filled
                      size={17}
                      className="shrink-0 text-[#B8CEFF]"
                    />
                  )}
                </div>

                <div className="mt-2.5" style={{ fontFamily: font.sansStack }}>
                  <p className="text-[13px] font-semibold text-[#F4F5F7]">{font.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#9BA1B2]">
                    {font.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Banner Watch Model Selector (Flat Watch Editions) */}
      <div className="lg-surface space-y-3 rounded-[20px] border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              Hero Banner Watch Model
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">
              Pick which flat Galaxy Watch hardware frame wraps the Discover hero display
            </p>
          </div>
          <M3Icon name="watch" size={18} className="shrink-0 text-[#B8CEFF]" />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {HERO_WATCH_OPTIONS.map((watchOpt) => {
            const selected = (activeTheme.heroWatch || 'galaxy-watch-1') === watchOpt.id;
            return (
              <button
                key={watchOpt.id}
                type="button"
                onClick={() => updateTheme({ heroWatch: watchOpt.id })}
                className={`lg-card flex items-center gap-3 rounded-[16px] border p-3 text-left transition-all ${
                  selected ? 'lg-nav-active ring-1 ring-[#A8C0FF]/45' : ''
                }`}
              >
                <div className="lg-inset flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border">
                  <FlatWatchFrame model={watchOpt.id} preview />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-[#F4F5F7]">
                      {watchOpt.name}
                    </p>
                    {selected && (
                      <M3Icon
                        name="check_circle"
                        filled
                        size={16}
                        className="shrink-0 text-[#B8CEFF]"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#9BA1B2]">
                    {watchOpt.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Watch Strap Style (Sports Silicone, Woven Nylon / NATO, Stitched Leather, Milanese Mesh) */}
      <div className="lg-surface space-y-3 rounded-[20px] border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-[13.5px] font-semibold text-[#F4F5F7]">
              Watch Strap Style
            </h4>
            <p className="text-[12px] text-[#9BA1B2]">
              Change the wristband material and texture rendered on the hero Galaxy Watch
            </p>
          </div>
          <span className="lg-pill rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-[#B8CEFF]">
            {WATCH_STRAP_OPTIONS.length} Styles
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {WATCH_STRAP_OPTIONS.map((strapOpt) => {
            const selected = (activeTheme.heroStrap || 'sports') === strapOpt.id;
            return (
              <button
                key={strapOpt.id}
                type="button"
                onClick={() => updateTheme({ heroStrap: strapOpt.id })}
                className={`lg-card flex flex-col justify-between rounded-[16px] border p-3.5 text-left transition-all ${
                  selected ? 'lg-nav-active ring-1 ring-[#A8C0FF]/45' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="lg-inset flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border">
                    <WatchStrapPreviewSvg strap={strapOpt.id} />
                  </div>
                  {selected && (
                    <M3Icon
                      name="check_circle"
                      filled
                      size={18}
                      className="shrink-0 text-[#B8CEFF]"
                    />
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: strapOpt.swatch }}
                    />
                    <p className="truncate text-[13px] font-semibold text-[#F4F5F7]">
                      {strapOpt.name}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-[#9BA1B2]">
                    {strapOpt.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
