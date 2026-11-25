import { useEffect, useState } from 'react';

interface RealtimeAnalogWatchFaceProps {
  onOpenApps?: () => void;
  onOpenCustomize?: () => void;
  onOpenSettings?: () => void;
}

export function RealtimeAnalogWatchFace({
  onOpenApps,
  onOpenCustomize,
  onOpenSettings,
}: RealtimeAnalogWatchFaceProps) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setTime(new Date());
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const ms = time.getMilliseconds();
  const seconds = time.getSeconds() + ms / 1000;
  const minutes = time.getMinutes() + seconds / 60;
  const hours = (time.getHours() % 12) + minutes / 60;

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6;
  const hourAngle = hours * 30;

  const timeString = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 60 minute ticks
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const isFiveMin = i % 5 === 0;
    const angleRad = (i * 6 * Math.PI) / 180;
    const r1 = isFiveMin ? 85 : 88.5;
    const r2 = isFiveMin ? 93 : 92;
    const x1 = 100 + r1 * Math.sin(angleRad);
    const y1 = 100 - r1 * Math.cos(angleRad);
    const x2 = 100 + r2 * Math.sin(angleRad);
    const y2 = 100 - r2 * Math.cos(angleRad);

    return {
      id: i,
      x1,
      y1,
      x2,
      y2,
      isFiveMin,
    };
  });

  // 12 hour baton markers
  const hourBatons = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    const angleRad = (hour * 30 * Math.PI) / 180;
    const isCardinal = hour % 3 === 0; // 12, 3, 6, 9
    const rInner = isCardinal ? 52 : 55;
    const rOuter = 67;
    const x1 = 100 + rInner * Math.sin(angleRad);
    const y1 = 100 - rInner * Math.cos(angleRad);
    const x2 = 100 + rOuter * Math.sin(angleRad);
    const y2 = 100 - rOuter * Math.cos(angleRad);

    return {
      hour,
      x1,
      y1,
      x2,
      y2,
      strokeWidth: isCardinal ? 3.4 : 2.8,
    };
  });

  return (
    <div
      className="group relative h-full w-full select-none"
      title={`Live PC Time: ${timeString}`}
      aria-label={`Live PC Time: ${timeString}`}
    >
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <defs>
          {/* Radial depth for matte obsidian dial */}
          <radialGradient id="liveWatchDialGrad" cx="50%" cy="48%" r="65%">
            <stop offset="0%" stopColor="#1B1D23" />
            <stop offset="65%" stopColor="#111216" />
            <stop offset="100%" stopColor="#08090C" />
          </radialGradient>

          {/* Hand drop shadow for realistic layered depth */}
          <filter id="handShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="1.5"
              floodColor="#000000"
              floodOpacity="0.65"
            />
          </filter>
        </defs>

        {/* Dial base */}
        <circle cx="100" cy="100" r="99" fill="url(#liveWatchDialGrad)" />

        {/* Outer bezel ring tracks */}
        <circle
          cx="100"
          cy="100"
          r="93.5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="84.5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="0.6"
        />

        {/* 12 o'clock top pointer triangle (▼) */}
        <polygon points="100,7 103.8,1.8 96.2,1.8" fill="#FFFFFF" opacity="0.95" />

        {/* 60 Minute / Second Ticks */}
        <g>
          {minuteTicks.map((tick) => (
            <line
              key={`tick-${tick.id}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.isFiveMin ? '#FFFFFF' : 'rgba(255, 255, 255, 0.32)'}
              strokeWidth={tick.isFiveMin ? 1.8 : 0.9}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* 12 Hour Baton Markers */}
        <g>
          {hourBatons.map((b) => (
            <line
              key={`hour-baton-${b.hour}`}
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              stroke="#FFFFFF"
              strokeWidth={b.strokeWidth}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Right bezel shortcut indicators from Image 2 */}
        <g className="cursor-pointer transition-opacity hover:opacity-100">
          {/* 1. Bell icon at ~68 degrees (Notifications / Sound) */}
          <g
            transform="translate(186, 68)"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings?.();
            }}
            className="cursor-pointer"
          >
            <path
              d="M0,-5.5 C0,-7.5 4,-7.5 4,-5.5 L4,-2 L5,-1 L-1,-1 L0,-2 Z M1.2,-1 C1.2,0.2 2.8,0.2 2.8,-1"
              fill="none"
              stroke="rgba(255, 255, 255, 0.72)"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* 2. Sliders icon at ~90 degrees (Customize / Settings) */}
          <g
            transform="translate(188, 100)"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCustomize?.();
            }}
            className="cursor-pointer"
          >
            {/* Top slider */}
            <line
              x1="-5"
              y1="-2.5"
              x2="5"
              y2="-2.5"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="0.9"
            />
            <circle
              cx="2"
              cy="-2.5"
              r="1.4"
              fill="#FFFFFF"
              stroke="#111216"
              strokeWidth="0.6"
            />
            {/* Bottom slider */}
            <line
              x1="-5"
              y1="2.5"
              x2="5"
              y2="2.5"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="0.9"
            />
            <circle
              cx="-2"
              cy="2.5"
              r="1.4"
              fill="#FFFFFF"
              stroke="#111216"
              strokeWidth="0.6"
            />
          </g>

          {/* 3. Download tray icon at ~112 degrees (Tizen App Sideloader) */}
          <g
            transform="translate(186, 132)"
            onClick={(e) => {
              e.stopPropagation();
              onOpenApps?.();
            }}
            className="cursor-pointer"
          >
            {/* Tray container */}
            <path
              d="M-4,1 L-4,4 L4,4 L4,1"
              fill="none"
              stroke="rgba(255, 255, 255, 0.72)"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrow down */}
            <line
              x1="0"
              y1="-4"
              x2="0"
              y2="2"
              stroke="rgba(255, 255, 255, 0.72)"
              strokeWidth="0.9"
            />
            <polyline
              points="-2,0.2 0,2.4 2,0.2"
              fill="none"
              stroke="rgba(255, 255, 255, 0.72)"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* Center hands group with shadow */}
        <g filter="url(#handShadow)">
          {/* HOUR HAND */}
          <g transform={`rotate(${hourAngle} 100 100)`}>
            <line
              x1="100"
              y1="107"
              x2="100"
              y2="56"
              stroke="#FFFFFF"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
          </g>

          {/* MINUTE HAND */}
          <g transform={`rotate(${minuteAngle} 100 100)`}>
            <line
              x1="100"
              y1="109"
              x2="100"
              y2="31"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </g>

          {/* SECOND HAND (Sleek light silver needle sweeping in real time) */}
          <g transform={`rotate(${secondAngle} 100 100)`}>
            {/* Main needle */}
            <line
              x1="100"
              y1="118"
              x2="100"
              y2="18"
              stroke="#C4CBD8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Counterweight disc */}
            <circle cx="100" cy="112" r="2.2" fill="#C4CBD8" />
          </g>

          {/* CENTER CAP / PINION */}
          <circle cx="100" cy="100" r="3.6" fill="#FFFFFF" />
          <circle cx="100" cy="100" r="1.3" fill="#14161C" />
        </g>

        {/* Ambient subtle convex glass sheen */}
        <path
          d="M30,30 Q100,5 170,30 Q100,55 30,30 Z"
          fill="rgba(255, 255, 255, 0.04)"
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}
