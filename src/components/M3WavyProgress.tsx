import { useId } from 'react';

interface M3WavyLinearProgressProps {
  value?: number;
  indeterminate?: boolean;
  label?: string;
  className?: string;
}

/**
 * Material 3 Expressive Squiggly / Wavy Linear Progress Indicator:
 * - Animated sinusoidal active wave with rounded stroke caps
 * - Track gap between active wave and remaining flat track
 * - M3 end-stop dot at the right edge of the track
 */
export function M3WavyLinearProgress({
  value = 60,
  indeterminate = false,
  label,
  className = '',
}: M3WavyLinearProgressProps) {
  const clipId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const width = 320;
  const height = 14;
  const cy = height / 2;
  const amp = 3.2;
  const wavelength = 16;

  // Build continuous sinusoidal SVG wave across 2x width so CSS translateX animates seamlessly
  const buildWavePath = () => {
    const pts: string[] = [];
    const totalW = width + wavelength * 2;
    const step = 2;
    for (let x = 0; x <= totalW; x += step) {
      const y = cy + Math.sin((x / wavelength) * Math.PI * 2) * amp;
      pts.push(`${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(2)}`);
    }
    return pts.join(' ');
  };

  const activeEnd = indeterminate ? width * 0.45 : (width * clamped) / 100;
  const gap = clamped > 0 && clamped < 100 ? 6 : 0;
  const trackStart = Math.min(width - 4, activeEnd + gap);

  return (
    <div className={`w-full space-y-1.5 ${className}`} role="progressbar" aria-valuenow={indeterminate ? undefined : clamped} aria-valuemin={0} aria-valuemax={100}>
      {label && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#C9CEDB]">{label}</span>
          {!indeterminate && (
            <span className="font-mono text-[#A8C0FF] tabular-nums">{Math.round(clamped)}%</span>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-3.5 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id={clipId}>
            {indeterminate ? (
              <rect x="0" y="0" width={width * 0.42} height={height} rx="4">
                <animate
                  attributeName="x"
                  values={`-${width * 0.35};${width}`}
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              </rect>
            ) : (
              <rect x="0" y="0" width={Math.max(2, activeEnd)} height={height} />
            )}
          </clipPath>
        </defs>

        {/* Inactive flat track */}
        {indeterminate ? (
          <line
            x1="4"
            y1={cy}
            x2={width - 4}
            y2={cy}
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : (
          clamped < 98 && (
            <line
              x1={Math.max(4, trackStart)}
              y1={cy}
              x2={width - 6}
              y2={cy}
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )
        )}

        {/* M3 end-stop dot */}
        {clamped < 98 && <circle cx={width - 2.5} cy={cy} r="2" fill="#A8C0FF" fillOpacity="0.85" />}

        {/* Active sinusoidal squiggly wave */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d={buildWavePath()}
            fill="none"
            stroke="#A8C0FF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to={`-${wavelength} 0`}
              dur="0.75s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>
    </div>
  );
}

interface M3WavyCircularSpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Material 3 Expressive Wavy Circular Spinner
 */
export function M3WavyCircularSpinner({
  size = 28,
  className = '',
}: M3WavyCircularSpinnerProps) {
  const cx = 24;
  const cy = 24;
  const baseR = 17;
  const amp = 1.9;
  const lobes = 10;

  // Parametric wavy circle
  const points: string[] = [];
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = baseR + Math.sin(theta * lobes) * amp;
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`shrink-0 ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle
        cx={cx}
        cy={cy}
        r={baseR}
        fill="none"
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth="3.2"
      />
      <path
        d={`${points.join(' ')} Z`}
        fill="none"
        stroke="#A8C0FF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="62 52"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`360 ${cx} ${cy}`}
          dur="1.15s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
