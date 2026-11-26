import { useEffect, useState } from 'react';

export function useComposerHeightAnimation(enabled: boolean) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [enabled]);
  return enabled && animate;
}
