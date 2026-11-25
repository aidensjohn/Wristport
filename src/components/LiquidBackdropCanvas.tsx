export function LiquidBackdropCanvas() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'var(--wp-backdrop, radial-gradient(ellipse 75% 50% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 65%), linear-gradient(180deg, #050608 0%, #0B0D12 52%, #050608 100%))',
      }}
    />
  );
}
