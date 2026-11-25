import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { M3Icon } from './M3Icon';
import {
  APP_FONT_OPTIONS,
  HERO_WATCH_OPTIONS,
  WATCH_STRAP_OPTIONS,
  ZORIN_OPTIONS,
} from '../themes/themeRegistry';
import type { HeroWatchModel, ThemeConfig, ThemeFamily, WatchStrapType } from '../types';

interface FirstBootSetupWizardProps {
  open: boolean;
  onComplete: (finalTheme: ThemeConfig) => void;
  onStartDeviceSetup: (watchModel: HeroWatchModel) => void;
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

export function FirstBootSetupWizard({
  open,
  onComplete,
  onStartDeviceSetup,
}: FirstBootSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Draft theme configuration during wizard
  const [family, setFamily] = useState<ThemeFamily>('zorin');
  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  const [heroWatch, setHeroWatch] = useState<HeroWatchModel>('galaxy-watch-1');
  const [heroStrap, setHeroStrap] = useState<WatchStrapType>('sports');
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const displayName = profileName.trim() || 'Watch enthusiast';
  const initial = displayName.charAt(0).toUpperCase() || 'W';

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    try {
      const dataUrl = await cropAvatarToSquareDataUrl(file);
      setProfileAvatar(dataUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not process photo.');
    }
  };

  const handleFinish = (skipConnection = false) => {
    const finalTheme: ThemeConfig = {
      family,
      mode,
      zorinMode: mode,
      material3Color: 'emerald',
      catppuccinFlavor: 'mocha',
      catppuccinAccent: 'mauve',
      fontFamily: 'default',
      heroWatch,
      heroStrap,
      profileName: displayName,
      profileAvatar,
    };
    onComplete(finalTheme);
    if (!skipConnection) {
      onStartDeviceSetup(heroWatch);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" aria-hidden="true" />

      {/* Wizard Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        className="lg-surface-elevated relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border p-6 sm:p-8 shadow-2xl"
      >
        {/* Progress header dots */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="lg-pill-accent flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-[#0E1015]">
              {step}
            </span>
            <span className="text-[12px] font-medium text-[#9BA1B2]">
              Step {step} of 4 — {step === 1 ? 'App Theme' : step === 2 ? 'Watch Model & Strap' : step === 3 ? 'Username & Avatar' : 'Ready Setup'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-6 bg-[#A8C0FF]' : s < step ? 'w-2 bg-[#A8C0FF]/50' : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: APP THEME & APPEARANCE */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h2 id="wizard-title" className="font-display text-2xl font-bold tracking-tight text-[#F4F5F7]">
                Choose your app theme
              </h2>
              <p className="mt-1 text-[13px] text-[#9BA1B2]">
                Select the interface styling and color mode for your Wristport companion.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: 'zorin', name: 'Zorin OS', subtitle: 'Clean Scandinavian desktop styling', swatches: ['#15A6F0', '#11161D'] },
                { id: 'liquid-glass', name: 'Liquid Glass', subtitle: 'Refractive clear optical bezel', swatches: ['#2563EB', '#05070D'] },
                { id: 'glassmorphism', name: 'Glassmorphism', subtitle: 'Deep frosted blur cards', swatches: ['#38BDF8', '#0B1120'] },
                { id: 'bento-grid', name: 'Bento Grid', subtitle: 'Clean matte stepped modular tiles', swatches: ['#EA580C', '#121316'] },
              ].map((t) => {
                const selected = family === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFamily(t.id as ThemeFamily)}
                    className={`lg-card flex flex-col justify-between rounded-[20px] border p-4 text-left transition-all ${
                      selected ? 'lg-nav-active ring-2 ring-[#A8C0FF]' : 'hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-display text-[14px] font-bold text-[#F4F5F7]">{t.name}</span>
                      {selected && <M3Icon name="check_circle" filled size={18} className="text-[#B8CEFF]" />}
                    </div>
                    <p className="mt-1 text-[11.5px] text-[#9BA1B2]">{t.subtitle}</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      {t.swatches.map((hex, i) => (
                        <span key={i} className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {(['dark', 'light'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full px-4 py-2 text-[12.5px] font-medium transition-all ${
                      mode === m ? 'lg-pill-accent font-semibold text-[#0E1015]' : 'lg-pill text-[#9BA1B2]'
                    }`}
                  >
                    {m === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="lg-pill-accent flex h-11 items-center gap-2 rounded-full px-6 font-semibold text-[#0E1015] transition-all hover:brightness-105"
              >
                <span>Next: Watch Style</span>
                <M3Icon name="arrow_forward" size={17} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WATCH MODEL & STRAP */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#F4F5F7]">
                Configure your hero watch
              </h2>
              <p className="mt-1 text-[13px] text-[#9BA1B2]">
                Pick your Galaxy Watch model and wristband material for the Discover banner.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#9BA1B2]">
                Galaxy Watch Edition
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {HERO_WATCH_OPTIONS.map((w) => {
                  const selected = heroWatch === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setHeroWatch(w.id)}
                      className={`lg-card rounded-[16px] border p-3 text-left transition-all ${
                        selected ? 'lg-nav-active ring-2 ring-[#A8C0FF]' : 'hover:border-white/20'
                      }`}
                    >
                      <p className="truncate text-[12.5px] font-bold text-[#F4F5F7]">{w.name}</p>
                      <p className="mt-0.5 truncate text-[10.5px] text-[#9BA1B2]">{w.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#9BA1B2]">
                Watch Strap Style
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {WATCH_STRAP_OPTIONS.map((s) => {
                  const selected = heroStrap === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setHeroStrap(s.id)}
                      className={`lg-card rounded-[16px] border p-3 text-left transition-all ${
                        selected ? 'lg-nav-active ring-2 ring-[#A8C0FF]' : 'hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: s.swatch }} />
                        <p className="truncate text-[12.5px] font-bold text-[#F4F5F7]">{s.name}</p>
                      </div>
                      <p className="mt-1 truncate text-[10.5px] text-[#9BA1B2]">{s.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="lg-pill rounded-full px-5 py-2.5 text-[12.5px] font-medium text-[#9BA1B2] hover:text-[#F4F5F7]"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="lg-pill-accent flex h-11 items-center gap-2 rounded-full px-6 font-semibold text-[#0E1015] transition-all hover:brightness-105"
              >
                <span>Next: Profile</span>
                <M3Icon name="arrow_forward" size={17} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: USERNAME & AVATAR */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#F4F5F7]">
                Set up your profile
              </h2>
              <p className="mt-1 text-[13px] text-[#9BA1B2]">
                Choose your username and profile photo (no password required).
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="lg-orb flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/30 text-2xl font-bold text-[#B8CEFF] shadow-inner">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="lg-pill-accent absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-[#0E1015] shadow-md transition-transform hover:scale-110"
                  title="Upload profile photo"
                >
                  <M3Icon name="photo_camera" size={15} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void handleAvatarFile(e)}
              />

              {profileAvatar && (
                <button
                  type="button"
                  onClick={() => setProfileAvatar('')}
                  className="text-[11.5px] font-medium text-[#9BA1B2] hover:text-[#F4F5F7]"
                >
                  Remove photo
                </button>
              )}

              {avatarError && <p className="text-[12px] text-[#F58585]">{avatarError}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wizard-username" className="block text-[12px] font-semibold text-[#CBD5E1]">
                Username
              </label>
              <input
                id="wizard-username"
                type="text"
                autoFocus
                maxLength={36}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Watch enthusiast"
                className="lg-input h-11 w-full rounded-[16px] border px-4 text-[14px] text-[#F4F5F7] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#A8C0FF]/50"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="lg-pill rounded-full px-5 py-2.5 text-[12.5px] font-medium text-[#9BA1B2] hover:text-[#F4F5F7]"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="lg-pill-accent flex h-11 items-center gap-2 rounded-full px-6 font-semibold text-[#0E1015] transition-all hover:brightness-105"
              >
                <span>Next: All Set</span>
                <M3Icon name="arrow_forward" size={17} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: POPUP "All set! Now let's set up your device" */}
        {step === 4 && (
          <div className="space-y-6 text-center animate-fadeIn py-4">
            <div className="lg-pill-accent mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] text-[#0E1015] shadow-xl">
              <M3Icon name="check_circle" filled size={40} />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#F4F5F7]">
                All set! Now let's set up your device.
              </h2>
              <p className="mx-auto max-w-sm text-[14px] leading-relaxed text-[#9BA1B2]">
                Your theme, profile, and hero watch (<span className="text-[#B8CEFF] font-semibold">{HERO_WATCH_OPTIONS.find((w) => w.id === heroWatch)?.name || 'Galaxy Watch'}</span>) are configured. Would you like to connect your watch over wireless SDB now?
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => handleFinish(false)}
                className="lg-pill-accent flex h-12 items-center justify-center gap-2 rounded-full px-8 font-semibold text-[#0E1015] transition-all hover:brightness-105"
              >
                <M3Icon name="wifi" size={18} />
                <span>Connect Watch Now</span>
              </button>

              <button
                type="button"
                onClick={() => handleFinish(true)}
                className="lg-pill flex h-12 items-center justify-center gap-2 rounded-full px-8 font-medium text-[#CBD5E1] transition-all hover:text-white"
              >
                <span>Skip for later</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
