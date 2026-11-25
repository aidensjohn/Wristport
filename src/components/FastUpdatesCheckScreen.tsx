import { useEffect, useState } from 'react';
import { M3Icon } from './M3Icon';

interface FastUpdatesCheckScreenProps {
  onComplete: () => void;
}

export function FastUpdatesCheckScreen({ onComplete }: FastUpdatesCheckScreenProps) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Checking for Tizen OS updates...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(55);
      setStatusText('Syncing Tizen Archive catalog...');
    }, 380);

    const t2 = setTimeout(() => {
      setProgress(90);
      setStatusText('Verifying SDB bridge daemon...');
    }, 720);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Ready');
    }, 980);

    const t4 = setTimeout(() => {
      onComplete();
    }, 1150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D16]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1A2234]/40 via-transparent to-transparent pointer-events-none" />

      <div className="lg-surface relative z-10 w-full max-w-sm rounded-[28px] border p-8 text-center shadow-2xl">
        <div className="lg-pill-accent mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] text-[#0E1015] shadow-lg">
          <M3Icon name="update" filled size={30} className="animate-spin" />
        </div>

        <h3 className="font-display text-xl font-bold tracking-tight text-[#F4F5F7]">
          wristport
        </h3>
        <p className="mt-1.5 text-[13px] text-[#9BA1B2]">
          {statusText}
        </p>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#8EE5D8] to-[#A8C0FF] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 font-mono text-[11px] tabular-nums text-[#64748B]">
          {progress}%
        </p>
      </div>
    </div>
  );
}
