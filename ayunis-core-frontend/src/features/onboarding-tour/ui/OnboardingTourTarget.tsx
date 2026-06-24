import type { TourTargetName } from '@/shared/config/onboarding';
import { TOUR_TARGET } from '@/shared/config/onboarding';
import { useLayoutEffect, useRef } from 'react';

interface OnboardingTourTargetProps {
  name: TourTargetName;
  children: React.ReactNode;
}

export function OnboardingTourTarget({
  name,
  children,
}: Readonly<OnboardingTourTargetProps>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) {
      return;
    }
    const el = wrapper.firstElementChild;
    if (!(el instanceof HTMLElement)) {
      return;
    }

    // Prevent multiple elements from sharing the same tour target for the
    // "pin skill" step. Only the first occurrence gets the data attribute so
    // the spotlight reliably points at a single, predictable control.
    if (name === TOUR_TARGET.pinSkill) {
      const existing = document.querySelector(`[data-tour="${name}"]`);
      if (existing && existing !== el) {
        return;
      }
    }

    el.dataset.tour = name;
    return () => {
      delete el.dataset.tour;
    };
  }, [name]);

  return <div ref={ref}>{children}</div>;
}
