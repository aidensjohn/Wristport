import type { HeroSlide, TizenApp } from '../types';

export const HERO_SLIDES: HeroSlide[] = [
  {
    index: '01',
    label: 'Real-time Watch Face',
    timeDisplay: 'LIVE PC TIME',
    subDisplay: 'LIVE PC SYNC',
    accent: '#FFFFFF',
    watchTitle: 'Real-time PC Watch Face',
  },
  {
    index: '02',
    label: 'Apps',
    timeDisplay: 'APPS',
    subDisplay: 'TIZEN ARCHIVE',
    accent: '#A8C0FF',
    watchTitle: 'Apps',
  },
  {
    index: '03',
    label: 'Ready',
    timeDisplay: ';)',
    subDisplay: 'HELLO WRIST',
    accent: '#D4DCE8',
    watchTitle: 'Galaxy Watch',
  },
];

// All apps are fetched live from https://tizen-archive.com/ (zero fake apps)
export const TIZEN_APPS: TizenApp[] = [];
