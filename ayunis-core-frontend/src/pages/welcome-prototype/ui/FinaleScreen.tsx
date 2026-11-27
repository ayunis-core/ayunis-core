import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@ayunis/ui/lib/cn';
import { CitySkyline } from './CitySkyline';
import './chat-flow.css';

const CITY_HOLD_MS = 6500;
const EXIT_MS = 1400;

export function FinaleScreen() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const exitId = window.setTimeout(() => setLeaving(true), CITY_HOLD_MS);
    const navigateId = window.setTimeout(
      () => void navigate({ to: '/chat' }),
      CITY_HOLD_MS + EXIT_MS,
    );
    return () => {
      window.clearTimeout(exitId);
      window.clearTimeout(navigateId);
    };
  }, [navigate]);

  return (
    <section className={cn('wp-flow wp-city-scene', leaving && 'is-leaving')}>
      <CitySkyline />
      <h2 className="wp-flow__title wp-city-scene__title">
        Jetzt smart arbeiten.
      </h2>
    </section>
  );
}
