import { useLayoutEffect, useRef } from 'react';
import type { SpotlightTargetName } from '@/shared/ui/spotlight-overlay/lib/spotlight-targets';

interface SpotlightTargetProps {
  name: SpotlightTargetName;
  children: React.ReactNode;
}

/**
 * Marks any element/component as a spotlight target without touching it.
 * Renders a plain wrapper `<div>` and applies `data-spotlight` to the first
 * rendered child DOM node via a layout effect, so the SpotlightOverlay can
 * find it.
 *
 * The wrapper is a normal block element so layout properties from the parent
 * (margin from `space-y-*` / `space-x-*`, flex/grid sizing, etc.) propagate
 * correctly — unlike `display: contents`, which drops margins.
 */
export function SpotlightTarget({
  name,
  children,
}: Readonly<SpotlightTargetProps>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const el = wrapper.firstElementChild;
    if (!(el instanceof HTMLElement)) return;
    el.dataset.spotlight = name;
    return () => {
      delete el.dataset.spotlight;
    };
  });

  return <div ref={ref}>{children}</div>;
}
