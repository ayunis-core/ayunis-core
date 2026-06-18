import type { TourTargetName } from '@/entities/onboarding';
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

    el.dataset.tour = name;
    return () => {
      delete el.dataset.tour;
    };
  });

  return <div ref={ref}>{children}</div>;
}
