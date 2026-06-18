import type { TourTargetName } from './tour-targets';
import { useLayoutEffect, useRef } from 'react';

interface TourTargetProps {
  name: TourTargetName;
  children: React.ReactNode;
}

export function TourTarget({ name, children }: Readonly<TourTargetProps>) {
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
