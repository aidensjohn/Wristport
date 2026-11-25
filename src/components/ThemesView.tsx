import { ThemeSettingsPanel } from './ThemeSettingsPanel';
import { DEFAULT_THEME_CONFIG } from '../themes/themeRegistry';
import type { ThemeConfig } from '../types';

interface ThemesViewProps {
  theme?: ThemeConfig;
  onChangeTheme: (next: ThemeConfig) => void;
}

export function ThemesView({ theme, onChangeTheme }: ThemesViewProps) {
  return (
    <div className="space-y-6">
      <div className="lg-surface flex flex-col justify-between gap-4 rounded-[24px] border p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#B8CEFF]">
            PERSONALIZE WRISTPORT
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#F4F5F7]">
            Customize App
          </h1>
          <p className="mt-1 text-[13.5px] text-[#9BA1B2]">
            Customize themes, global Light/Dark mode, fonts, and visual styling in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChangeTheme(DEFAULT_THEME_CONFIG)}
          className="lg-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium text-[#E4E7F0]"
        >
          <span>Reset to Default</span>
        </button>
      </div>

      <ThemeSettingsPanel theme={theme} onChangeTheme={onChangeTheme} />
    </div>
  );
}
