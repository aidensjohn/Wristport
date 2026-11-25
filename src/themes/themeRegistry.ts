import type {
  AppFontId,
  CatppuccinAccent,
  CatppuccinFlavor,
  HeroWatchModel,
  Material3Color,
  ThemeConfig,
  ThemeMode,
  WatchStrapType,
  ZorinMode,
} from '../types';

export interface HeroWatchOption {
  id: HeroWatchModel;
  name: string;
  subtitle: string;
}

export const HERO_WATCH_OPTIONS: HeroWatchOption[] = [
  {
    id: 'galaxy-watch-1',
    name: 'Galaxy Watch 1 (46mm)',
    subtitle: 'Silver body · Matte black tick bezel',
  },
  {
    id: 'galaxy-watch-3',
    name: 'Galaxy Watch 3 (45mm)',
    subtitle: 'Mystic black · Round dual pushers',
  },
  {
    id: 'gear-s3-classic',
    name: 'Gear S3 Classic',
    subtitle: 'Polished silver bezel & crown buttons',
  },
  {
    id: 'gear-s3-frontier',
    name: 'Gear S3 Frontier',
    subtitle: 'Rugged matte slate · Notched gear bezel',
  },
  {
    id: 'minimal-glass',
    name: 'Minimal Glass',
    subtitle: 'Translucent bezel frame',
  },
];

export interface WatchStrapOption {
  id: WatchStrapType;
  name: string;
  subtitle: string;
  swatch: string;
}

export const WATCH_STRAP_OPTIONS: WatchStrapOption[] = [
  {
    id: 'sports',
    name: 'Sports Silicone',
    subtitle: 'Matte ventilated elastomer with pinhole ridge',
    swatch: '#1E232D',
  },
  {
    id: 'nylon',
    name: 'Woven Nylon / NATO',
    subtitle: 'Tactile cross-weave ballistic fabric loop with keeper',
    swatch: '#3D4A3E',
  },
  {
    id: 'leather',
    name: 'Stitched Leather',
    subtitle: 'Warm calfskin brown with saddle edge stitching',
    swatch: '#784A28',
  },
  {
    id: 'milanese',
    name: 'Milanese Mesh / Steel Link',
    subtitle: 'Brushed stainless interlocking metallic links',
    swatch: '#94A0AE',
  },
];

export interface AppFontOption {
  id: AppFontId;
  label: string;
  subtitle: string;
  displayStack: string;
  sansStack: string;
}

export const APP_FONT_OPTIONS: AppFontOption[] = [
  {
    id: 'default',
    label: 'Jakarta & DM Sans',
    subtitle: 'Default · Balanced modern geometric pairing',
    displayStack: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'sf-pro-display',
    label: 'SF Pro Display',
    subtitle: 'Apple San Francisco crisp optical display sans',
    displayStack:
      '"SF Pro Display", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif',
    sansStack:
      '"SF Pro Display", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'one-ui-sans',
    label: 'One UI Sans',
    subtitle: 'Samsung Galaxy One UI signature interface font',
    displayStack: '"One UI Sans", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"One UI Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'oppo-sans',
    label: 'OPPO Sans',
    subtitle: 'Clean ColorOS humanist geometric sans-serif',
    displayStack: '"OPPO Sans", "OPPOSans", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"OPPO Sans", "OPPOSans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'google-sans',
    label: 'Google Sans',
    subtitle: 'Friendly geometric Google Product UI typeface',
    displayStack: '"Google Sans", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"Google Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'inter',
    label: 'Inter',
    subtitle: 'Clean neutral interface sans-serif',
    displayStack: '"Inter", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    subtitle: 'Sharp technical hardware display headings',
    displayStack: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'nunito',
    label: 'Nunito Rounded',
    subtitle: 'Friendly rounded aesthetic for desktop & mobile',
    displayStack: '"Nunito", ui-sans-serif, system-ui, sans-serif',
    sansStack: '"Nunito", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    subtitle: 'Developer terminal & SDB monospace feel',
    displayStack: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    sansStack: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  {
    id: 'system',
    label: 'System UI',
    subtitle: 'Native OS sans-serif (zero extra webfont load)',
    displayStack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    sansStack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  family: 'zorin',
  mode: 'dark',
  fontFamily: 'default',
  material3Color: 'indigo',
  zorinMode: 'dark',
  catppuccinFlavor: 'mocha',
  catppuccinAccent: 'mauve',
  heroWatch: 'galaxy-watch-1',
  heroStrap: 'sports',
  profileName: 'Watch enthusiast',
  profileAvatar: '',
};

export interface Material3ToneTokens {
  accent: string;
  onAccent: string;
  bg: string;
  sidebar: string;
  surface: string;
  card: string;
  elevated: string;
  inset: string;
  border: string;
  pillBg: string;
  text1: string;
  text2: string;
}

export interface Material3PaletteOption {
  id: Material3Color;
  label: string;
  dark: Material3ToneTokens;
  light: Material3ToneTokens;
}

export const MATERIAL3_OPTIONS: Material3PaletteOption[] = [
  {
    id: 'indigo',
    label: 'Indigo',
    dark: {
      accent: '#A8C7FA',
      onAccent: '#062E6F',
      bg: '#111318',
      sidebar: '#171A21',
      surface: '#1D2027',
      card: '#232730',
      elevated: '#282C37',
      inset: '#15181E',
      border: 'rgba(168, 199, 250, 0.2)',
      pillBg: 'rgba(168, 199, 250, 0.12)',
      text1: '#E2E2E9',
      text2: '#A8ADB8',
    },
    light: {
      accent: '#3659B5',
      onAccent: '#FFFFFF',
      bg: '#F8F9FF',
      sidebar: '#EEF1FA',
      surface: '#FFFFFF',
      card: '#F2F5FC',
      elevated: '#FFFFFF',
      inset: '#E5E9F4',
      border: 'rgba(54, 89, 181, 0.16)',
      pillBg: 'rgba(54, 89, 181, 0.08)',
      text1: '#191C24',
      text2: '#565D6F',
    },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    dark: {
      accent: '#77DAA6',
      onAccent: '#003824',
      bg: '#0E1512',
      sidebar: '#131C18',
      surface: '#18221D',
      card: '#1E2924',
      elevated: '#23302A',
      inset: '#101814',
      border: 'rgba(119, 218, 166, 0.2)',
      pillBg: 'rgba(119, 218, 166, 0.12)',
      text1: '#DFE5E1',
      text2: '#9CB0A6',
    },
    light: {
      accent: '#146C43',
      onAccent: '#FFFFFF',
      bg: '#F3FAF6',
      sidebar: '#E6F3EC',
      surface: '#FFFFFF',
      card: '#EDF7F1',
      elevated: '#FFFFFF',
      inset: '#DCEBE2',
      border: 'rgba(20, 108, 67, 0.16)',
      pillBg: 'rgba(20, 108, 67, 0.08)',
      text1: '#151E19',
      text2: '#4B5E54',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    dark: {
      accent: '#FFB2BA',
      onAccent: '#5E1121',
      bg: '#191113',
      sidebar: '#21171A',
      surface: '#271C1F',
      card: '#2F2226',
      elevated: '#36272C',
      inset: '#1C1315',
      border: 'rgba(255, 178, 186, 0.2)',
      pillBg: 'rgba(255, 178, 186, 0.12)',
      text1: '#EFE0E2',
      text2: '#BCA5AA',
    },
    light: {
      accent: '#B32645',
      onAccent: '#FFFFFF',
      bg: '#FFF7F8',
      sidebar: '#F8ECEE',
      surface: '#FFFFFF',
      card: '#FDF1F3',
      elevated: '#FFFFFF',
      inset: '#F1E1E4',
      border: 'rgba(179, 38, 69, 0.16)',
      pillBg: 'rgba(179, 38, 69, 0.08)',
      text1: '#24171A',
      text2: '#6B5258',
    },
  },
  {
    id: 'amber',
    label: 'Amber',
    dark: {
      accent: '#F4C86A',
      onAccent: '#3F2E00',
      bg: '#17130D',
      sidebar: '#1F1A12',
      surface: '#251F16',
      card: '#2D261C',
      elevated: '#342C20',
      inset: '#1A1610',
      border: 'rgba(244, 200, 106, 0.22)',
      pillBg: 'rgba(244, 200, 106, 0.12)',
      text1: '#ECE2D4',
      text2: '#B8AC99',
    },
    light: {
      accent: '#9A5D00',
      onAccent: '#FFFFFF',
      bg: '#FFF9F0',
      sidebar: '#F6EEE1',
      surface: '#FFFFFF',
      card: '#FBF4E8',
      elevated: '#FFFFFF',
      inset: '#ECE2D1',
      border: 'rgba(154, 93, 0, 0.18)',
      pillBg: 'rgba(154, 93, 0, 0.08)',
      text1: '#221B11',
      text2: '#665947',
    },
  },
  {
    id: 'violet',
    label: 'Violet',
    dark: {
      accent: '#D0BCFF',
      onAccent: '#381E72',
      bg: '#141218',
      sidebar: '#1B1821',
      surface: '#211E28',
      card: '#282431',
      elevated: '#2F2A3A',
      inset: '#17141C',
      border: 'rgba(208, 188, 255, 0.22)',
      pillBg: 'rgba(208, 188, 255, 0.12)',
      text1: '#E6E0E9',
      text2: '#AEA6B8',
    },
    light: {
      accent: '#6750A4',
      onAccent: '#FFFFFF',
      bg: '#FAF7FF',
      sidebar: '#F0ECF9',
      surface: '#FFFFFF',
      card: '#F5F1FC',
      elevated: '#FFFFFF',
      inset: '#E7E1F4',
      border: 'rgba(103, 80, 164, 0.16)',
      pillBg: 'rgba(103, 80, 164, 0.08)',
      text1: '#1D1B22',
      text2: '#5D5868',
    },
  },
];

export const ZORIN_OPTIONS: Record<
  ZorinMode,
  {
    label: string;
    scheme: 'dark' | 'light';
    accent: string;
    onAccent: string;
    bg: string;
    sidebar: string;
    topbar: string;
    surface: string;
    card: string;
    elevated: string;
    inset: string;
    border: string;
    pillBg: string;
    text1: string;
    text2: string;
  }
> = {
  dark: {
    label: 'Dark',
    scheme: 'dark',
    accent: '#15A6F0',
    onAccent: '#FFFFFF',
    bg: '#11161D',
    sidebar: '#151B24',
    topbar: '#151B24',
    surface: '#1A222D',
    card: '#1E2734',
    elevated: '#222D3C',
    inset: '#121820',
    border: 'rgba(148, 163, 184, 0.18)',
    pillBg: 'rgba(255, 255, 255, 0.08)',
    text1: '#E8EEF5',
    text2: '#94A3B8',
  },
  light: {
    label: 'Light',
    scheme: 'light',
    accent: '#0E8EE9',
    onAccent: '#FFFFFF',
    bg: '#EEF3F8',
    sidebar: '#F8FAFC',
    topbar: '#FFFFFF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    inset: '#E6ECF4',
    border: 'rgba(15, 23, 42, 0.12)',
    pillBg: 'rgba(15, 23, 42, 0.06)',
    text1: '#0F172A',
    text2: '#475569',
  },
};

export interface CatppuccinFlavorPalette {
  id: CatppuccinFlavor;
  label: string;
  scheme: 'dark' | 'light';
  base: string;
  mantle: string;
  crust: string;
  surface0: string;
  surface1: string;
  surface2: string;
  text: string;
  subtext: string;
  accents: Record<CatppuccinAccent, string>;
}

export const CATPPUCCIN_ACCENT_META: Array<{ id: CatppuccinAccent; label: string }> = [
  { id: 'rosewater', label: 'Rosewater' },
  { id: 'flamingo', label: 'Flamingo' },
  { id: 'pink', label: 'Pink' },
  { id: 'mauve', label: 'Mauve' },
  { id: 'red', label: 'Red' },
  { id: 'maroon', label: 'Maroon' },
  { id: 'peach', label: 'Peach' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'teal', label: 'Teal' },
  { id: 'sky', label: 'Sky' },
  { id: 'sapphire', label: 'Sapphire' },
  { id: 'blue', label: 'Blue' },
  { id: 'lavender', label: 'Lavender' },
];

export const CATPPUCCIN_FLAVORS: Record<CatppuccinFlavor, CatppuccinFlavorPalette> = {
  latte: {
    id: 'latte',
    label: 'Latte',
    scheme: 'light',
    base: '#EFF1F5',
    mantle: '#E6E9EF',
    crust: '#DCE0E8',
    surface0: '#FFFFFF',
    surface1: '#F7F8FB',
    surface2: '#E4E7EE',
    text: '#4C4F69',
    subtext: '#6C6F85',
    accents: {
      rosewater: '#DC8A78',
      flamingo: '#DD7878',
      pink: '#EA76CB',
      mauve: '#8839EF',
      red: '#D20F39',
      maroon: '#E64553',
      peach: '#FE640B',
      yellow: '#DF8E1D',
      green: '#40A02B',
      teal: '#179299',
      sky: '#04A5E5',
      sapphire: '#209FB5',
      blue: '#1E66F5',
      lavender: '#7287FD',
    },
  },
  frappe: {
    id: 'frappe',
    label: 'Frappé',
    scheme: 'dark',
    base: '#303446',
    mantle: '#292C3C',
    crust: '#232634',
    surface0: '#393E53',
    surface1: '#414559',
    surface2: '#51576D',
    text: '#C6D0F5',
    subtext: '#A5ADCE',
    accents: {
      rosewater: '#F2D5CF',
      flamingo: '#EEBEBE',
      pink: '#F4B8E4',
      mauve: '#CA9EE6',
      red: '#E78284',
      maroon: '#EA999C',
      peach: '#EF9F76',
      yellow: '#E5C890',
      green: '#A6D189',
      teal: '#81C8BE',
      sky: '#99D1DB',
      sapphire: '#85C1DC',
      blue: '#8CAAEE',
      lavender: '#BABBF1',
    },
  },
  macchiato: {
    id: 'macchiato',
    label: 'Macchiato',
    scheme: 'dark',
    base: '#24273A',
    mantle: '#1E2030',
    crust: '#181926',
    surface0: '#2D3147',
    surface1: '#363A4F',
    surface2: '#494D64',
    text: '#CAD3F5',
    subtext: '#A5ADCB',
    accents: {
      rosewater: '#F4DBD6',
      flamingo: '#F0C6C6',
      pink: '#F5BDE6',
      mauve: '#C6A0F6',
      red: '#ED8796',
      maroon: '#EE99A0',
      peach: '#F5A97F',
      yellow: '#EED49F',
      green: '#A6DA95',
      teal: '#8BD5CA',
      sky: '#91D7E3',
      sapphire: '#7DC4E4',
      blue: '#8AADF4',
      lavender: '#B7BDF8',
    },
  },
  mocha: {
    id: 'mocha',
    label: 'Mocha',
    scheme: 'dark',
    base: '#1E1E2E',
    mantle: '#181825',
    crust: '#11111B',
    surface0: '#27273A',
    surface1: '#313244',
    surface2: '#45475A',
    text: '#CDD6F4',
    subtext: '#A6ADC8',
    accents: {
      rosewater: '#F5E0DC',
      flamingo: '#F2CDCD',
      pink: '#F5C2E7',
      mauve: '#CBA6F7',
      red: '#F38BA8',
      maroon: '#EBA0AC',
      peach: '#FAB387',
      yellow: '#F9E2AF',
      green: '#A6E3A1',
      teal: '#94E2D5',
      sky: '#89DCEB',
      sapphire: '#74C7EC',
      blue: '#89B4FA',
      lavender: '#B4BEFE',
    },
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveEffectiveThemeMode(theme: ThemeConfig): ThemeMode {
  if (theme.mode === 'light' || theme.mode === 'dark') {
    return theme.mode;
  }
  if (theme.family === 'zorin') {
    return theme.zorinMode || 'dark';
  }
  if (theme.family === 'catppuccin') {
    return theme.catppuccinFlavor === 'latte' ? 'light' : 'dark';
  }
  return 'dark';
}

export function applyThemeToDocument(themeInput?: Partial<ThemeConfig>): void {
  const theme: ThemeConfig = { ...DEFAULT_THEME_CONFIG, ...themeInput };
  const effectiveMode = resolveEffectiveThemeMode(theme);
  const root = document.documentElement;
  const style = root.style;

  const selectedFont =
    APP_FONT_OPTIONS.find((f) => f.id === theme.fontFamily) || APP_FONT_OPTIONS[0];
  root.setAttribute('data-theme-font', selectedFont.id);
  if (selectedFont.id === 'default') {
    style.removeProperty('--font-display');
    style.removeProperty('--font-sans');
  } else {
    style.setProperty('--font-display', selectedFont.displayStack);
    style.setProperty('--font-sans', selectedFont.sansStack);
  }

  root.setAttribute('data-theme-family', theme.family);
  root.removeAttribute('data-theme-style');
  style.removeProperty('--wp-shadow-solid');

  if (theme.family === 'liquid-glass' && effectiveMode === 'dark') {
    root.setAttribute('data-theme-scheme', 'dark');
    root.removeAttribute('data-theme-custom');
    root.removeAttribute('data-theme-liquid-light');
    style.removeProperty('--wp-bg');
    style.removeProperty('--wp-backdrop');
    style.removeProperty('--wp-sidebar');
    style.removeProperty('--wp-topbar');
    style.removeProperty('--wp-surface');
    style.removeProperty('--wp-card');
    style.removeProperty('--wp-elevated');
    style.removeProperty('--wp-inset');
    style.removeProperty('--wp-border');
    style.removeProperty('--wp-pill-bg');
    style.removeProperty('--wp-text-1');
    style.removeProperty('--wp-text-2');
    style.removeProperty('--wp-accent');
    style.removeProperty('--wp-accent-soft');
    style.removeProperty('--wp-on-accent');
    style.removeProperty('--wp-success');
    style.removeProperty('--wp-danger');
    return;
  }

  root.setAttribute('data-theme-custom', 'true');

  if (theme.family === 'liquid-glass' && effectiveMode === 'light') {
    root.setAttribute('data-theme-scheme', 'light');
    root.setAttribute('data-theme-liquid-light', 'true');
    style.setProperty('--wp-bg', '#EEF3FA');
    style.setProperty(
      '--wp-backdrop',
      'radial-gradient(ellipse 75% 50% at 50% 0%, rgba(59, 130, 246, 0.14) 0%, transparent 65%), linear-gradient(180deg, #F4F7FC 0%, #E8EFF8 52%, #F4F7FC 100%)'
    );
    style.setProperty('--wp-sidebar', 'rgba(255, 255, 255, 0.72)');
    style.setProperty('--wp-topbar', 'rgba(255, 255, 255, 0.76)');
    style.setProperty('--wp-surface', 'rgba(255, 255, 255, 0.78)');
    style.setProperty('--wp-card', 'rgba(255, 255, 255, 0.72)');
    style.setProperty('--wp-elevated', 'rgba(255, 255, 255, 0.92)');
    style.setProperty('--wp-inset', 'rgba(226, 232, 240, 0.65)');
    style.setProperty('--wp-border', 'rgba(15, 23, 42, 0.12)');
    style.setProperty('--wp-pill-bg', 'rgba(255, 255, 255, 0.72)');
    style.setProperty('--wp-text-1', '#0F172A');
    style.setProperty('--wp-text-2', '#475569');
    style.setProperty('--wp-accent', '#2563EB');
    style.setProperty('--wp-accent-soft', 'rgba(37, 99, 235, 0.14)');
    style.setProperty('--wp-on-accent', '#FFFFFF');
    style.setProperty('--wp-success', '#15803D');
    style.setProperty('--wp-danger', '#DC2626');
    return;
  }

  root.removeAttribute('data-theme-liquid-light');

  if (theme.family === 'material3') {
    const opt =
      MATERIAL3_OPTIONS.find((o) => o.id === theme.material3Color) || MATERIAL3_OPTIONS[0];
    const pal = effectiveMode === 'light' ? opt.light : opt.dark;
    const isLight = effectiveMode === 'light';
    root.setAttribute('data-theme-scheme', effectiveMode);
    style.setProperty('--wp-bg', pal.bg);
    style.setProperty(
      '--wp-backdrop',
      `radial-gradient(ellipse 75% 45% at 50% 0%, ${hexToRgba(pal.accent, isLight ? 0.1 : 0.08)} 0%, transparent 65%), ${pal.bg}`
    );
    style.setProperty('--wp-sidebar', pal.sidebar);
    style.setProperty('--wp-topbar', pal.sidebar);
    style.setProperty('--wp-surface', pal.surface);
    style.setProperty('--wp-card', pal.card);
    style.setProperty('--wp-elevated', pal.elevated);
    style.setProperty('--wp-inset', pal.inset);
    style.setProperty('--wp-border', pal.border);
    style.setProperty('--wp-pill-bg', pal.pillBg);
    style.setProperty('--wp-text-1', pal.text1);
    style.setProperty('--wp-text-2', pal.text2);
    style.setProperty('--wp-accent', pal.accent);
    style.setProperty('--wp-accent-soft', hexToRgba(pal.accent, isLight ? 0.15 : 0.22));
    style.setProperty('--wp-on-accent', pal.onAccent);
    style.setProperty('--wp-success', isLight ? '#15803D' : '#6EE7B7');
    style.setProperty('--wp-danger', isLight ? '#DC2626' : '#F58585');
    return;
  }

  if (theme.family === 'zorin') {
    const z = ZORIN_OPTIONS[effectiveMode] || ZORIN_OPTIONS.dark;
    root.setAttribute('data-theme-scheme', z.scheme);
    style.setProperty('--wp-bg', z.bg);
    style.setProperty(
      '--wp-backdrop',
      z.scheme === 'light'
        ? `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(21, 166, 240, 0.09) 0%, transparent 65%), ${z.bg}`
        : `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(21, 166, 240, 0.11) 0%, transparent 65%), ${z.bg}`
    );
    style.setProperty('--wp-sidebar', z.sidebar);
    style.setProperty('--wp-topbar', z.topbar);
    style.setProperty('--wp-surface', z.surface);
    style.setProperty('--wp-card', z.card);
    style.setProperty('--wp-elevated', z.elevated);
    style.setProperty('--wp-inset', z.inset);
    style.setProperty('--wp-border', z.border);
    style.setProperty('--wp-pill-bg', z.pillBg);
    style.setProperty('--wp-text-1', z.text1);
    style.setProperty('--wp-text-2', z.text2);
    style.setProperty('--wp-accent', z.accent);
    style.setProperty('--wp-accent-soft', hexToRgba(z.accent, 0.18));
    style.setProperty('--wp-on-accent', z.onAccent);
    style.setProperty('--wp-success', z.scheme === 'light' ? '#15803D' : '#4ADE80');
    style.setProperty('--wp-danger', z.scheme === 'light' ? '#DC2626' : '#F87171');
    return;
  }

  if (theme.family === 'glassmorphism') {
    const isLight = effectiveMode === 'light';
    root.setAttribute('data-theme-scheme', effectiveMode);
    root.setAttribute('data-theme-style', 'glassmorphism');
    style.setProperty('--wp-bg', isLight ? '#E7EEF9' : '#0B1120');
    style.setProperty(
      '--wp-backdrop',
      isLight
        ? 'radial-gradient(circle at 14% 18%, rgba(56, 189, 248, 0.28) 0%, transparent 45%), radial-gradient(circle at 86% 22%, rgba(167, 139, 250, 0.26) 0%, transparent 46%), radial-gradient(circle at 52% 85%, rgba(45, 212, 191, 0.2) 0%, transparent 48%), linear-gradient(155deg, #EEF4FD 0%, #E2ECFA 55%, #ECF1FC 100%)'
        : 'radial-gradient(circle at 16% 18%, rgba(56, 189, 248, 0.24) 0%, transparent 44%), radial-gradient(circle at 84% 20%, rgba(168, 85, 247, 0.22) 0%, transparent 46%), radial-gradient(circle at 50% 88%, rgba(20, 184, 166, 0.16) 0%, transparent 48%), linear-gradient(160deg, #090E1C 0%, #0E172A 52%, #080D1A 100%)'
    );
    style.setProperty('--wp-sidebar', isLight ? 'rgba(255, 255, 255, 0.56)' : 'rgba(22, 32, 56, 0.52)');
    style.setProperty('--wp-topbar', isLight ? 'rgba(255, 255, 255, 0.62)' : 'rgba(22, 32, 56, 0.56)');
    style.setProperty('--wp-surface', isLight ? 'rgba(255, 255, 255, 0.58)' : 'rgba(26, 37, 64, 0.48)');
    style.setProperty('--wp-card', isLight ? 'rgba(255, 255, 255, 0.54)' : 'rgba(30, 43, 74, 0.46)');
    style.setProperty('--wp-elevated', isLight ? 'rgba(255, 255, 255, 0.84)' : 'rgba(20, 29, 52, 0.82)');
    style.setProperty('--wp-inset', isLight ? 'rgba(226, 236, 249, 0.68)' : 'rgba(11, 17, 32, 0.56)');
    style.setProperty('--wp-border', isLight ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.2)');
    style.setProperty('--wp-pill-bg', isLight ? 'rgba(255, 255, 255, 0.66)' : 'rgba(255, 255, 255, 0.1)');
    style.setProperty('--wp-text-1', isLight ? '#0F172A' : '#F1F5F9');
    style.setProperty('--wp-text-2', isLight ? '#475569' : '#94A3B8');
    style.setProperty('--wp-accent', isLight ? '#0284C7' : '#38BDF8');
    style.setProperty('--wp-accent-soft', isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.2)');
    style.setProperty('--wp-on-accent', isLight ? '#FFFFFF' : '#082F49');
    style.setProperty('--wp-success', isLight ? '#15803D' : '#34D399');
    style.setProperty('--wp-danger', isLight ? '#DC2626' : '#FB7185');
    return;
  }

  if (theme.family === 'linear-obsidian') {
    const isLight = effectiveMode === 'light';
    root.setAttribute('data-theme-scheme', effectiveMode);
    root.setAttribute('data-theme-style', 'linear-obsidian');
    style.setProperty('--wp-bg', isLight ? '#FAFAFA' : '#09090B');
    style.setProperty(
      '--wp-backdrop',
      isLight
        ? 'radial-gradient(ellipse 65% 40% at 50% 0%, rgba(24, 24, 27, 0.04) 0%, transparent 70%), #FAFAFA'
        : 'radial-gradient(ellipse 65% 40% at 50% 0%, rgba(255, 255, 255, 0.045) 0%, transparent 70%), #09090B'
    );
    style.setProperty('--wp-sidebar', isLight ? '#FFFFFF' : '#0D0D10');
    style.setProperty('--wp-topbar', isLight ? '#FFFFFF' : '#0D0D10');
    style.setProperty('--wp-surface', isLight ? '#FFFFFF' : '#111114');
    style.setProperty('--wp-card', isLight ? '#FFFFFF' : '#131316');
    style.setProperty('--wp-elevated', isLight ? '#FFFFFF' : '#16161A');
    style.setProperty('--wp-inset', isLight ? '#F4F4F5' : '#0A0A0D');
    style.setProperty('--wp-border', isLight ? 'rgba(9, 9, 11, 0.1)' : 'rgba(255, 255, 255, 0.1)');
    style.setProperty('--wp-pill-bg', isLight ? '#F4F4F5' : 'rgba(255, 255, 255, 0.06)');
    style.setProperty('--wp-text-1', isLight ? '#09090B' : '#FAFAFA');
    style.setProperty('--wp-text-2', isLight ? '#52525B' : '#A1A1AA');
    style.setProperty('--wp-accent', isLight ? '#18181B' : '#EDEDEF');
    style.setProperty('--wp-accent-soft', isLight ? 'rgba(24, 24, 27, 0.09)' : 'rgba(255, 255, 255, 0.12)');
    style.setProperty('--wp-on-accent', isLight ? '#FFFFFF' : '#09090B');
    style.setProperty('--wp-success', isLight ? '#16A34A' : '#4ADE80');
    style.setProperty('--wp-danger', isLight ? '#DC2626' : '#F87171');
    return;
  }

  if (theme.family === 'bento-grid') {
    const isLight = effectiveMode === 'light';
    root.setAttribute('data-theme-scheme', effectiveMode);
    root.setAttribute('data-theme-style', 'bento-grid');
    style.setProperty('--wp-bg', isLight ? '#F1F2F6' : '#121316');
    style.setProperty('--wp-backdrop', isLight ? '#F1F2F6' : '#121316');
    style.setProperty('--wp-sidebar', isLight ? '#FFFFFF' : '#1A1C21');
    style.setProperty('--wp-topbar', isLight ? '#FFFFFF' : '#1A1C21');
    style.setProperty('--wp-surface', isLight ? '#FFFFFF' : '#1D2026');
    style.setProperty('--wp-card', isLight ? '#FFFFFF' : '#23262E');
    style.setProperty('--wp-elevated', isLight ? '#FFFFFF' : '#262A33');
    style.setProperty('--wp-inset', isLight ? '#EAECEF' : '#14161A');
    style.setProperty('--wp-border', isLight ? 'rgba(17, 24, 39, 0.08)' : 'rgba(255, 255, 255, 0.08)');
    style.setProperty('--wp-pill-bg', isLight ? '#EAECEF' : '#2B2F38');
    style.setProperty('--wp-text-1', isLight ? '#111827' : '#F3F4F6');
    style.setProperty('--wp-text-2', isLight ? '#6B7280' : '#9CA3AF');
    style.setProperty('--wp-accent', isLight ? '#EA580C' : '#FF7849');
    style.setProperty('--wp-accent-soft', isLight ? 'rgba(234, 88, 12, 0.12)' : 'rgba(255, 120, 73, 0.16)');
    style.setProperty('--wp-on-accent', '#FFFFFF');
    style.setProperty('--wp-success', isLight ? '#15803D' : '#34D399');
    style.setProperty('--wp-danger', isLight ? '#DC2626' : '#F87171');
    return;
  }

  if (theme.family === 'neo-brutalism') {
    const isLight = effectiveMode === 'light';
    root.setAttribute('data-theme-scheme', effectiveMode);
    root.setAttribute('data-theme-style', 'neo-brutalism');
    style.setProperty('--wp-bg', isLight ? '#FFFDF5' : '#16161A');
    style.setProperty('--wp-backdrop', isLight ? '#FFFDF5' : '#16161A');
    style.setProperty('--wp-sidebar', isLight ? '#FFF4D6' : '#1F1F26');
    style.setProperty('--wp-topbar', isLight ? '#FFFFFF' : '#1F1F26');
    style.setProperty('--wp-surface', isLight ? '#FFFFFF' : '#23232B');
    style.setProperty('--wp-card', isLight ? '#FFFFFF' : '#282832');
    style.setProperty('--wp-elevated', isLight ? '#FFFDF5' : '#282832');
    style.setProperty('--wp-inset', isLight ? '#FEF3C7' : '#191920');
    style.setProperty('--wp-border', isLight ? '#18181B' : 'rgba(244, 244, 245, 0.78)');
    style.setProperty('--wp-pill-bg', isLight ? '#FEF08A' : '#2F2F3B');
    style.setProperty('--wp-text-1', isLight ? '#18181B' : '#FAFAFA');
    style.setProperty('--wp-text-2', isLight ? '#52525B' : '#C4C4CF');
    style.setProperty('--wp-accent', isLight ? '#FACC15' : '#FACC15');
    style.setProperty('--wp-accent-soft', isLight ? 'rgba(250, 204, 21, 0.34)' : 'rgba(250, 204, 21, 0.22)');
    style.setProperty('--wp-on-accent', '#18181B');
    style.setProperty('--wp-shadow-solid', isLight ? '#18181B' : '#000000');
    style.setProperty('--wp-success', isLight ? '#15803D' : '#4ADE80');
    style.setProperty('--wp-danger', isLight ? '#DC2626' : '#FB7185');
    return;
  }

  // Catppuccin (respects global Light/Dark mode: Latte when Light, dark flavor when Dark)
  const resolvedFlavorId: CatppuccinFlavor =
    effectiveMode === 'light'
      ? 'latte'
      : theme.catppuccinFlavor === 'latte'
      ? 'mocha'
      : theme.catppuccinFlavor || 'mocha';
  const flavor = CATPPUCCIN_FLAVORS[resolvedFlavorId] || CATPPUCCIN_FLAVORS.mocha;
  const accentHex = flavor.accents[theme.catppuccinAccent] || flavor.accents.mauve;
  const isLight = flavor.scheme === 'light';
  root.setAttribute('data-theme-scheme', flavor.scheme);
  style.setProperty('--wp-bg', flavor.base);
  style.setProperty(
    '--wp-backdrop',
    `radial-gradient(ellipse 70% 45% at 50% 0%, ${hexToRgba(accentHex, isLight ? 0.11 : 0.08)} 0%, transparent 65%), ${flavor.base}`
  );
  style.setProperty('--wp-sidebar', flavor.mantle);
  style.setProperty('--wp-topbar', flavor.mantle);
  style.setProperty('--wp-surface', flavor.surface0);
  style.setProperty('--wp-card', flavor.surface1);
  style.setProperty('--wp-elevated', flavor.surface0);
  style.setProperty('--wp-inset', flavor.crust);
  style.setProperty(
    '--wp-border',
    isLight ? 'rgba(76, 79, 105, 0.16)' : hexToRgba(accentHex, 0.22)
  );
  style.setProperty(
    '--wp-pill-bg',
    isLight ? 'rgba(76, 79, 105, 0.08)' : hexToRgba(flavor.surface2, 0.65)
  );
  style.setProperty('--wp-text-1', flavor.text);
  style.setProperty('--wp-text-2', flavor.subtext);
  style.setProperty('--wp-accent', accentHex);
  style.setProperty('--wp-accent-soft', hexToRgba(accentHex, 0.2));
  style.setProperty('--wp-on-accent', isLight ? '#FFFFFF' : flavor.crust);
  style.setProperty('--wp-success', flavor.accents.green);
  style.setProperty('--wp-danger', flavor.accents.red);
}
