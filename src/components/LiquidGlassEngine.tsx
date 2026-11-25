import { useEffect } from 'react';

export function LiquidGlassEngine() {
  useEffect(() => {
    let activeEl: HTMLElement | null = null;
    let rafPending = false;
    let lastClientX = window.innerWidth * 0.6;
    let lastClientY = window.innerHeight * 0.32;
    let lastTarget: EventTarget | null = null;

    const applyPointerLight = () => {
      rafPending = false;
      const rootStyle = document.documentElement.style;
      const pctX = (lastClientX / Math.max(window.innerWidth, 1)) * 100;
      const pctY = (lastClientY / Math.max(window.innerHeight, 1)) * 100;
      rootStyle.setProperty('--lg-gx', `${pctX.toFixed(1)}%`);
      rootStyle.setProperty('--lg-gy', `${pctY.toFixed(1)}%`);

      const globalAngle =
        (Math.atan2(lastClientY - window.innerHeight * 0.5, lastClientX - window.innerWidth * 0.5) *
          180) /
          Math.PI +
        135;
      rootStyle.setProperty('--lg-angle', `${globalAngle.toFixed(1)}deg`);

      const targetEl = (lastTarget as HTMLElement | null)?.closest?.(
        '.lg-card, .lg-surface, .lg-surface-elevated, .lg-pill, .lg-orb'
      ) as HTMLElement | null;

      if (activeEl && activeEl !== targetEl) {
        activeEl.style.removeProperty('--card-active');
      }
      activeEl = targetEl;

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const lx = lastClientX - rect.left;
        const ly = lastClientY - rect.top;
        const localAngle =
          (Math.atan2(ly - rect.height * 0.5, lx - rect.width * 0.5) * 180) / Math.PI + 125;
        targetEl.style.setProperty('--card-mx', `${lx.toFixed(1)}px`);
        targetEl.style.setProperty('--card-my', `${ly.toFixed(1)}px`);
        targetEl.style.setProperty('--card-angle', `${localAngle.toFixed(1)}deg`);
        targetEl.style.setProperty('--card-active', '1');
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      lastTarget = e.target;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(applyPointerLight);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return null;
}
