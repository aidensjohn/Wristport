import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { M3Icon } from './M3Icon';

interface FirstBootWelcomeModalProps {
  open: boolean;
  initialName?: string;
  initialAvatar?: string;
  onComplete: (name: string, avatar: string) => void;
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

export function FirstBootWelcomeModal({
  open,
  initialName = '',
  initialAvatar = '',
  onComplete,
}: FirstBootWelcomeModalProps) {
  const [name, setName] = useState(initialName === 'Watch enthusiast' ? '' : initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const displayName = name.trim() || 'Watch enthusiast';
  const initial = displayName.charAt(0).toUpperCase() || 'W';

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    try {
      const dataUrl = await cropAvatarToSquareDataUrl(file);
      setAvatar(dataUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not process photo.');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onComplete(name.trim() || 'Watch enthusiast', avatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Floating Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-boot-title"
        className="lg-surface-elevated relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border p-6 sm:p-7 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="lg-pill-accent mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-[20px] text-[#0E1015] shadow-lg">
              <M3Icon name="watch" filled size={28} />
            </div>
            <h2 id="first-boot-title" className="font-display text-2xl font-bold tracking-tight text-[#F4F5F7]">
              Welcome to wristport
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#9BA1B2]">
              Set your name to personalize your Galaxy Watch app store and sideloading companion.
            </p>
          </div>

          {/* Profile Picture & Avatar Uploader */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="lg-orb flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/30 text-2xl font-bold text-[#B8CEFF] shadow-inner">
                {avatar ? (
                  <img src={avatar} alt="Avatar preview" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="lg-pill-accent absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-[#0E1015] shadow-md transition-transform hover:scale-110"
                title="Upload profile photo"
                aria-label="Upload profile photo"
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

            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar('')}
                className="text-[11.5px] font-medium text-[#9BA1B2] hover:text-[#F4F5F7]"
              >
                Remove photo
              </button>
            )}

            {avatarError && (
              <p className="text-[12px] text-[#F58585]">{avatarError}</p>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="first-boot-name" className="block text-[12px] font-semibold text-[#CBD5E1]">
              What should we call you?
            </label>
            <input
              id="first-boot-name"
              type="text"
              autoFocus
              maxLength={36}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name or handle..."
              className="lg-input h-11 w-full rounded-[16px] border px-4 text-[14px] text-[#F4F5F7] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#A8C0FF]/50"
            />
            <p className="text-[11px] text-[#7E8598]">
              This will appear in your sidebar, top navigation, and backup records. You can always change it in Customize App.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="lg-pill-accent flex h-11 w-full items-center justify-center gap-2 rounded-full font-semibold text-[#0E1015] transition-all hover:brightness-105 active:scale-[0.99]"
            >
              <span>Get Started</span>
              <M3Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
