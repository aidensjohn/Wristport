import type { TizenApp } from '../types';

interface AppIconArtworkProps {
  iconKey: TizenApp['iconKey'] | 'custom';
  accentColor?: string;
  size?: number;
}

export function AppIconArtwork({
  iconKey,
  accentColor = '#9DB2FF',
  size = 44,
}: AppIconArtworkProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  };

  switch (iconKey) {
    case 'chronograph':
      return (
        <svg {...commonProps}>
          <circle cx="24" cy="25" r="15" stroke={accentColor} strokeWidth="2.2" strokeOpacity="0.9" />
          <circle cx="24" cy="25" r="10.5" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="2 3" />
          <path d="M24 10V7M20 7H28" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24 25V17.5M24 25L29.5 28.5" stroke="#F4F5F7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="25" r="2" fill={accentColor} />
        </svg>
      );

    case 'orbital2048':
      return (
        <svg {...commonProps}>
          <rect x="9" y="9" width="13" height="13" rx="3.5" fill={accentColor} fillOpacity="0.22" stroke={accentColor} strokeWidth="1.8" />
          <rect x="26" y="9" width="13" height="13" rx="3.5" fill={accentColor} fillOpacity="0.48" stroke={accentColor} strokeWidth="1.8" />
          <rect x="9" y="26" width="13" height="13" rx="3.5" fill={accentColor} fillOpacity="0.48" stroke={accentColor} strokeWidth="1.8" />
          <rect x="26" y="26" width="13" height="13" rx="3.5" fill={accentColor} stroke={accentColor} strokeWidth="1.8" />
          <circle cx="32.5" cy="32.5" r="2.2" fill="#0F1014" />
        </svg>
      );

    case 'voicenote':
      return (
        <svg {...commonProps}>
          <rect x="19" y="8" width="10" height="18" rx="5" stroke={accentColor} strokeWidth="2.2" fill={accentColor} fillOpacity="0.16" />
          <path d="M13 22C13 28.075 17.925 33 24 33C30.075 33 35 28.075 35 22" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24 33V40M18 40H30" stroke="#F4F5F7" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'flappy':
      return (
        <svg {...commonProps}>
          <circle cx="23" cy="24" r="12" stroke={accentColor} strokeWidth="2.2" fill={accentColor} fillOpacity="0.16" />
          <path d="M16 25C19 20 25 20 28 24" stroke="#F4F5F7" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="28" cy="21" r="2" fill="#F4F5F7" />
          <path d="M35 23L41 25L35 27" fill={accentColor} />
        </svg>
      );

    case 'pipwatch':
      return (
        <svg {...commonProps}>
          <rect x="9" y="12" width="30" height="24" rx="6" stroke={accentColor} strokeWidth="2.2" fill={accentColor} fillOpacity="0.12" />
          <path d="M15 24H19L21.5 19L25.5 29L28 24H33" stroke="#F4F5F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'pomodoro':
      return (
        <svg {...commonProps}>
          <circle cx="24" cy="25" r="14" stroke={accentColor} strokeWidth="2.2" strokeOpacity="0.35" />
          <path d="M24 11A14 14 0 1 1 11.8 32" stroke={accentColor} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M24 18V25L29 27" stroke="#F4F5F7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'solitaire':
      return (
        <svg {...commonProps}>
          <rect x="11" y="10" width="18" height="24" rx="3.5" transform="rotate(-8 11 10)" stroke={accentColor} strokeWidth="1.8" fill={accentColor} fillOpacity="0.14" />
          <rect x="19" y="13" width="18" height="24" rx="3.5" stroke="#F4F5F7" strokeWidth="1.8" fill="rgba(16, 20, 32, 0.72)" />
          <path d="M28 20L32 25L28 30L24 25L28 20Z" fill={accentColor} />
        </svg>
      );

    case 'compass':
      return (
        <svg {...commonProps}>
          <circle cx="24" cy="24" r="15" stroke={accentColor} strokeWidth="2.2" fill={accentColor} fillOpacity="0.12" />
          <polygon points="24,13 28.5,24 24,22 19.5,24" fill={accentColor} />
          <polygon points="24,35 28.5,24 24,26 19.5,24" fill="#F4F5F7" fillOpacity="0.65" />
        </svg>
      );

    case 'solar':
      return (
        <svg {...commonProps}>
          <circle cx="24" cy="24" r="7" fill={accentColor} />
          <circle cx="24" cy="24" r="13.5" stroke={accentColor} strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="35.5" cy="17" r="2.5" fill="#F4F5F7" />
        </svg>
      );

    case 'snake':
      return (
        <svg {...commonProps}>
          <circle cx="24" cy="24" r="14.5" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.3" />
          <path
            d="M14 29C14 20 21 13 30 15C34 16 36 21 33 25C30 29 24 27 24 22"
            stroke={accentColor}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="22" r="2.2" fill="#F4F5F7" />
          <circle cx="17" cy="34" r="2.2" fill={accentColor} />
        </svg>
      );

    case 'serverping':
      return (
        <svg {...commonProps}>
          <rect x="10" y="11" width="28" height="10" rx="3" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.14" />
          <rect x="10" y="27" width="28" height="10" rx="3" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.14" />
          <circle cx="16" cy="16" r="1.8" fill="#4ADE80" />
          <circle cx="16" cy="32" r="1.8" fill={accentColor} />
          <path d="M22 16H32M22 32H32" stroke="#F4F5F7" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'bauhaus':
      return (
        <svg {...commonProps}>
          <circle cx="20" cy="20" r="8" fill={accentColor} fillOpacity="0.85" />
          <rect x="22" y="20" width="14" height="14" rx="2" stroke="#F4F5F7" strokeWidth="2" fill="rgba(16, 20, 32, 0.72)" fillOpacity="0.8" />
          <polygon points="14,36 22,22 30,36" fill={accentColor} fillOpacity="0.45" />
        </svg>
      );

    default:
      return (
        <svg {...commonProps}>
          <rect x="11" y="11" width="26" height="26" rx="7" stroke={accentColor} strokeWidth="2.2" fill={accentColor} fillOpacity="0.15" />
          <path d="M24 18V30M18 24H30" stroke="#F4F5F7" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
}
