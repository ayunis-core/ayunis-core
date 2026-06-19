import type { TourTargetName } from '@/shared/config/onboarding';
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
  }, [name]);

  return <div ref={ref}>{children}</div>;
}
