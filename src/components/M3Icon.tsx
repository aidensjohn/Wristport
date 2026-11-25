interface M3IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: number;
}

export function M3Icon({
  name,
  filled = false,
  className = '',
  size = 18,
}: M3IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded inline-flex items-center justify-center leading-none select-none shrink-0 ${filled ? 'filled' : ''} ${className}`}
      style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
    >
      {name}
    </span>
  );
}
