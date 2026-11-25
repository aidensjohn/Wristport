import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { HERO_SLIDES } from '../data/tizenApps';
import { FlatWatchFrame } from './FlatWatchFrame';
import { M3Icon } from './M3Icon';
import { RealtimeAnalogWatchFace } from './RealtimeAnalogWatchFace';
import type { HeroWatchModel, TizenApp, WatchStrapType } from '../types';

interface HeroBannerProps {
  onExploreApps: () => void;
  onConnectWatch: () => void;
  onOpenArchiveModal: () => void;
  onOpenCustomize?: () => void;
  watchApps?: TizenApp[];
  heroWatch?: HeroWatchModel;
  heroStrap?: WatchStrapType;
}

export function HeroBanner({
  onExploreApps,
  onConnectWatch,
  onOpenArchiveModal,
  onOpenCustomize,
  watchApps = [],
  heroWatch = 'galaxy-watch-1',
  heroStrap = 'sports',
}: HeroBannerProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const activeSlide = HERO_SLIDES[slideIndex];

  const previewApps =
    watchApps.length > 0
      ? watchApps.slice(0, 8)
      : [
          { id: '1', title: 'Tizen Archive', packageType: '.tpk' },
          { id: '2', title: 'Watch Utilities', packageType: '.tpk' },
          { id: '3', title: 'System Tools', packageType: '.tpk' },
          { id: '4', title: 'Wearable Games', packageType: '.wgt' },
          { id: '5', title: 'Health & Sensors', packageType: '.tpk' },
          { id: '6', title: 'Media Controls', packageType: '.tpk' },
        ];

  return (
    <section
      aria-label="Featured Tizen Revival"
      className="lg-surface relative overflow-hidden rounded-[28px] border p-6 sm:p-8 lg:p-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-12">
        {/* Left side copy & stadium-pill actions */}
        <div className="space-y-5 lg:col-span-7">
          <div className="lg-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11.5px] font-semibold tracking-[0.1em] text-[#C4D6FF]">
            <M3Icon name="auto_awesome" filled size={15} />
            <span>A LITTLE LOVE FOR YOUR OLD WATCH</span>
          </div>

          <h1 className="max-w-xl font-display text-3xl font-bold leading-[1.12] tracking-tight text-[#F4F5F7] sm:text-[40px] lg:text-[44px] [text-wrap:balance]">
            Give your Galaxy Watch a{' '}
            <span className="hero-accent-gradient bg-gradient-to-r from-[#C8D8FF] via-[#A8C0FF] to-[#8EE5D8] bg-clip-text text-transparent">
              second life.
            </span>
          </h1>

          <p className="max-w-lg text-[15px] leading-relaxed text-[#A3AAC0]">
            Rediscover the apps you loved. Browse the Tizen Archive, then bring them
            back to your wrist over wireless SDB.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onExploreApps}
              className="lg-pill-accent inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13.5px] font-semibold text-[#0A0D16] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF] whitespace-nowrap"
            >
              <span>Explore apps</span>
              <M3Icon name="arrow_downward" size={17} />
            </button>

            <button
              type="button"
              onClick={onConnectWatch}
              className="lg-pill inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13.5px] font-medium text-[#F4F5F7] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C0FF] whitespace-nowrap"
            >
              <M3Icon name="watch" size={17} className="text-[#B8CEFF]" />
              <span>Connect a watch</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-[12px] text-[#8E95AA]">
            <span>Built for Tizen. Made for enthusiasts.</span>
            <span aria-hidden="true" className="text-white/20">
              |
            </span>
            <button
              type="button"
              onClick={onOpenArchiveModal}
              className="inline-flex items-center gap-1 font-medium text-[#B8CEFF] transition-colors hover:text-[#DCE6FF]"
            >
              <span>Wi-Fi setup guide</span>
              <M3Icon name="arrow_outward" size={15} />
            </button>
          </div>
        </div>

        {/* Right side: Round Virtual Galaxy Watch with 3 Categories */}
        <div className="relative flex min-h-[264px] flex-col items-center justify-center lg:col-span-5">
          <div className="relative flex h-[240px] w-[268px] items-center justify-center">
            {/* Organic M3 Expressive 8-lobe clover halo */}
            <svg
              aria-hidden="true"
              viewBox="0 0 220 220"
              className="pointer-events-none absolute h-[220px] w-[220px] opacity-25"
            >
              <path
                d="M110,12 C132,12 142,30 160,36 C178,42 198,42 204,60 C210,78 192,94 192,110 C192,126 210,142 204,160 C198,178 178,178 160,184 C142,190 132,208 110,208 C88,208 78,190 60,184 C42,178 22,178 16,160 C10,142 28,126 28,110 C28,94 10,78 16,60 C22,42 42,42 60,36 C78,30 88,12 110,12 Z"
                fill="none"
                stroke="#D4DCE8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </svg>

            {/* Floating Liquid Glass orbital app squircles */}
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
              className="lg-orb absolute left-2 top-6 flex h-10 w-10 items-center justify-center rounded-[14px] border text-[#B8CEFF]"
            >
              <M3Icon name="schedule" filled size={18} />
            </motion.div>

            <motion.div
              animate={{ y: [3, -3, 3] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
              className="lg-orb absolute right-1 top-8 flex h-10 w-10 items-center justify-center rounded-[14px] border text-[#E5EAF4]"
            >
              <M3Icon name="apps" filled size={18} />
            </motion.div>

            <motion.div
              animate={{ y: [-2, 4, -2] }}
              transition={{ duration: 5.1, repeat: Infinity, ease: 'easeInOut' }}
              className="lg-orb absolute bottom-7 left-3 flex h-9 w-9 items-center justify-center rounded-[12px] border text-[#D4DCE8]"
            >
              <M3Icon name="sentiment_satisfied" filled size={17} />
            </motion.div>

            <motion.div
              animate={{ y: [3, -2, 3] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="lg-orb absolute bottom-8 right-2 flex h-9 w-9 items-center justify-center rounded-[12px] border text-[#A8C0FF]"
            >
              <M3Icon name="wifi" size={17} />
            </motion.div>

            <div
              className="relative cursor-pointer transition-transform hover:scale-[1.01]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              title="Click watch screen to cycle modes (Live PC Clock · Apps · Tizen Mascot)"
            >
              <FlatWatchFrame model={heroWatch} strap={heroStrap}>
                {/* Screen 1: Real-time Analog Watch Face from Image 2 */}
                {slideIndex === 0 && (
                  <RealtimeAnalogWatchFace
                    onOpenApps={onExploreApps}
                    onOpenCustomize={onOpenCustomize}
                    onOpenSettings={onOpenArchiveModal}
                  />
                )}

                {/* Screen 2: Apps (scrolling app list inside the round watch) */}
                {slideIndex === 1 && (
                  <div className="flex h-full w-full flex-col items-center justify-between px-2.5 py-1">
                    <span className="z-10 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#B8CEFF]">
                      APPS
                    </span>

                    <div className="relative my-1 h-[76px] w-full overflow-hidden">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-[#05070C] to-transparent"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-[#05070C] to-transparent"
                      />

                      <motion.div
                        animate={{ y: ['0%', '-50%'] }}
                        transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
                        className="space-y-1.5 px-1"
                      >
                        {[...previewApps, ...previewApps].map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="flex items-center justify-between gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2 py-1 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[#A8C0FF]" />
                              <span className="truncate text-[9px] font-medium text-[#F4F5F7]">
                                {item.title}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono text-[7.5px] text-[#9BA1B2]">
                              {item.packageType}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    </div>

                    <div className="z-10 flex items-center gap-1">
                      {HERO_SLIDES.map((s, idx) => (
                        <span
                          key={s.index}
                          className="h-1 rounded-full transition-all duration-300"
                          style={{
                            width: idx === slideIndex ? '12px' : '4px',
                            backgroundColor: idx === slideIndex ? '#A8C0FF' : 'rgba(255,255,255,0.22)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Screen 3: Smiling face that twirls in the screen and then winks */}
                {slideIndex === 2 && (
                  <div className="flex h-full w-full flex-col items-center justify-between px-2.5 py-1">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#D4DCE8]">
                      WRISTPORT
                    </span>

                    <motion.div
                      key="twirl-wink-face"
                      initial={{ rotate: 0, scale: 0.72 }}
                      animate={{ rotate: 360, scale: 1 }}
                      transition={{
                        rotate: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
                        scale: { duration: 0.75, ease: 'easeOut' },
                      }}
                      className="flex items-center justify-center"
                    >
                      <svg
                        viewBox="0 0 80 80"
                        className="h-[72px] w-[72px]"
                        aria-label="Smiling and winking watch face"
                      >
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          fill="rgba(255,255,255,0.06)"
                          stroke="#E8EEF8"
                          strokeWidth="2.5"
                        />
                        {/* Left eye (stays bright open) */}
                        <circle cx="29" cy="33" r="3.4" fill="#FFFFFF" />

                        {/* Right eye: blinks/winks smoothly AFTER twirl finishes */}
                        <motion.ellipse
                          cx="51"
                          cy="33"
                          rx="3.4"
                          fill="#FFFFFF"
                          initial={{ ry: 3.4 }}
                          animate={{ ry: [3.4, 3.4, 0.5, 0.5, 3.4] }}
                          transition={{
                            duration: 3.8,
                            delay: 1.15,
                            times: [0, 0.08, 0.16, 0.42, 0.52],
                            repeat: Infinity,
                            repeatDelay: 0.8,
                          }}
                        />

                        {/* Curved smile */}
                        <path
                          d="M27 47 C32 56, 48 56, 53 47"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </motion.div>

                    <div className="flex items-center gap-1">
                      {HERO_SLIDES.map((s, idx) => (
                        <span
                          key={s.index}
                          className="h-1 rounded-full transition-all duration-300"
                          style={{
                            width: idx === slideIndex ? '12px' : '4px',
                            backgroundColor: idx === slideIndex ? '#FFFFFF' : 'rgba(255,255,255,0.22)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </FlatWatchFrame>
            </div>
          </div>

          {/* Carousel Indicator 01 — 03 */}
          <div className="mt-2 flex w-full items-center justify-end px-1">
            <button
              type="button"
              onClick={() => setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="lg-pill flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11.5px] text-[#F4F5F7] tabular-nums transition-all hover:text-[#B8CEFF]"
              title="Click to cycle virtual watch mode"
            >
              <span className="text-[#B8CEFF]">{activeSlide.index}</span>
              <span className="text-white/30">—</span>
              <span className="text-[#A3AAC0]">03</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
