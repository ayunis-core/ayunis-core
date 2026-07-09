import { useEffect, useState, type AnimationEvent } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';
import './ayunis-progress-orb.css';

type OrbPhase = 'hidden' | 'working' | 'completing';

interface AyunisProgressOrbProps {
  /** True while Ayunis is working on the current task. */
  isActive: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const DISSOLVE_FALLBACK_MS = 900;

function initialPhase(isActive: boolean): OrbPhase {
  return isActive ? 'working' : 'hidden';
}

export function AyunisProgressOrb({
  isActive,
  size = 'sm',
  className,
  'aria-label': ariaLabel = 'Ayunis',
}: Readonly<AyunisProgressOrbProps>) {
  const [phase, setPhase] = useState<OrbPhase>(() => initialPhase(isActive));
  const [prevIsActive, setPrevIsActive] = useState(isActive);

  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    if (isActive) {
      setPhase('working');
    } else {
      setPhase((current) => (current === 'working' ? 'completing' : current));
    }
  }

  useEffect(() => {
    if (phase !== 'completing') return;

    const timeoutId = window.setTimeout(() => {
      setPhase('hidden');
    }, DISSOLVE_FALLBACK_MS);

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  const handleShellAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (phase !== 'completing') return;
    if (event.currentTarget !== event.target) return;
    if (
      event.animationName !== 'ayunis-orb-dissolve' &&
      event.animationName !== 'ayunis-orb-dissolve-reduced'
    ) {
      return;
    }
    setPhase('hidden');
  };

  if (phase === 'hidden') {
    return null;
  }

  const isWorking = phase === 'working';

  return (
    <div
      className={cn(
        'ayunis-progress-orb-shell',
        size === 'md' && 'ayunis-progress-orb-shell--md',
        isWorking && 'ayunis-progress-orb-shell--active',
        phase === 'completing' && 'ayunis-progress-orb-shell--completing',
        className,
      )}
      role="img"
      aria-label={ariaLabel}
      onAnimationEnd={handleShellAnimationEnd}
    >
      <div
        className={cn(
          'ayunis-progress-orb__motion',
          isWorking && 'ayunis-progress-orb__motion--working',
        )}
        aria-hidden
      >
        <div className="ayunis-progress-orb">
          <div className="ayunis-progress-orb__core" aria-hidden>
            <span className="ayunis-progress-orb__blob ayunis-progress-orb__blob--1" />
            <span className="ayunis-progress-orb__blob ayunis-progress-orb__blob--2" />
            <span className="ayunis-progress-orb__blob ayunis-progress-orb__blob--3" />
          </div>
          <div className="ayunis-progress-orb__glass" aria-hidden />
        </div>
      </div>
    </div>
  );
}
