import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { buildDemoTimeline } from '@/pages/welcome-prototype/model/demo-timeline';
import {
  FEATURE_DEMOS,
  type FeatureDemo as FeatureDemoData,
} from '@/pages/welcome-prototype/model/feature-demos';
import { useDelayedPhase } from '@/pages/welcome-prototype/model/use-delayed-phase';
import { withViewTransition } from '@/pages/welcome-prototype/model/view-transition';
import { FeatureDemo } from './FeatureDemo';

const HERO_MS = 3800;

function DemoRunner({ demo }: Readonly<{ demo: FeatureDemoData }>) {
  const { steps } = useMemo(() => buildDemoTimeline(demo), [demo]);
  const phase = useDelayedPhase(steps, 'idle');
  return <FeatureDemo demo={demo} phase={phase} />;
}

function AreaView({ demo }: Readonly<{ demo: FeatureDemoData }>) {
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowDemo(true), HERO_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className={cn('wp-area', showDemo && 'is-demo')}>
      <span className="wp-area__spacer" aria-hidden />
      <header className="wp-area__head">
        <h2 className="wp-area__title">{demo.title}</h2>
        <div className="wp-area__benefit">
          <p>{demo.benefit}</p>
        </div>
      </header>
      <div className="wp-area__body">
        {showDemo && <DemoRunner demo={demo} />}
      </div>
    </section>
  );
}

function ProgressBars({
  active,
  seen,
  areaMs,
  onSelect,
}: Readonly<{
  active: number;
  seen: number;
  areaMs: number;
  onSelect: (index: number) => void;
}>) {
  return (
    <div className="wp-slides__bars">
      {FEATURE_DEMOS.map((entry, index) => (
        <button
          key={entry.title}
          type="button"
          aria-label={entry.title}
          title={index <= seen ? entry.title : undefined}
          disabled={index > seen || index === active}
          className={cn(
            'wp-slides__bar',
            index < active && 'is-done',
            index > active && index <= seen && 'is-seen',
            index === active && 'is-active',
          )}
          style={
            index === active
              ? ({ '--wp-slide-ms': `${areaMs}ms` } as CSSProperties)
              : undefined
          }
          onClick={() => onSelect(index)}
        >
          <span />
        </button>
      ))}
    </div>
  );
}

export function CapabilitiesScreen({
  startAt = 0,
  onDone,
  onBack,
}: Readonly<{ startAt?: number; onDone: () => void; onBack: () => void }>) {
  const [active, setActive] = useState(startAt);
  const [seen, setSeen] = useState(startAt);
  const [finished, setFinished] = useState(false);
  const demo = FEATURE_DEMOS.at(active);
  const isLast = active === FEATURE_DEMOS.length - 1;
  const areaMs = demo ? HERO_MS + buildDemoTimeline(demo).total : 0;

  function show(index: number) {
    withViewTransition(() => {
      setActive(index);
      setSeen((current) => Math.max(current, index));
    });
  }

  useEffect(() => {
    if (!areaMs) return;
    const timeoutId = window.setTimeout(() => {
      if (isLast) setFinished(true);
      else show(active + 1);
    }, areaMs);
    return () => window.clearTimeout(timeoutId);
  }, [active, areaMs, isLast]);

  if (!demo) return null;

  return (
    <div className="wp-slides">
      <AreaView key={active} demo={demo} />
      <div className="wp-slides__footer">
        {finished && (
          <div className="wp-flow__nav wp-fade-in">
            <Button variant="ghost" onClick={onBack}>
              Zurück
            </Button>
            <Button onClick={onDone}>
              Weiter
              <ArrowRight />
            </Button>
          </div>
        )}
        <ProgressBars
          active={active}
          seen={finished ? FEATURE_DEMOS.length - 1 : seen}
          areaMs={areaMs}
          onSelect={show}
        />
      </div>
    </div>
  );
}
