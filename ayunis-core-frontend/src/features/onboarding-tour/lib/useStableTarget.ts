import { useEffect, useState } from 'react';

// Targets that animate into place carry their settle time on `data-tour-settle`
// (see <OnboardingTourTarget settleMs>). Joyride measures the target rect once
// when the run starts and never recomputes it, so for animated targets we hold
// the run for that long, leaving the spotlight on the final position. Targets
// with no settle time run immediately. Whether the target actually exists is
// left to joyride (its targetWaitTimeout fires TARGET_NOT_FOUND), so a missing
// target ends the tour instead of hanging here.
export function useStableTarget(target: string): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // If the target exists now, wait its settle time then start.
    const selector = `[data-tour="${target}"]`;
    const existing = document.querySelector(selector);

    let settleTimerId: number | undefined;
    let appearFallbackTimerId: number | undefined;
    let observer: MutationObserver | undefined;

    const startAfterSettle = (el: Element) => {
      const settleMs = Number(el.getAttribute('data-tour-settle')) || 0;
      settleTimerId = window.setTimeout(() => setIsReady(true), settleMs);
    };

    if (existing) {
      startAfterSettle(existing);
    } else {
      // Wait briefly for the target to appear, then honor its settle time.
      // If it never appears within this window, start anyway and let joyride's
      // own targetWaitTimeout handle TARGET_NOT_FOUND.
      const APPEAR_WAIT_MS = 1000;

      observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          if (appearFallbackTimerId !== undefined) {
            window.clearTimeout(appearFallbackTimerId);
            appearFallbackTimerId = undefined;
          }
          startAfterSettle(el);
          observer?.disconnect();
          observer = undefined;
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      appearFallbackTimerId = window.setTimeout(() => {
        // Element did not appear in time — proceed so joyride can handle timeout.
        setIsReady(true);
        if (observer) {
          observer.disconnect();
          observer = undefined;
        }
      }, APPEAR_WAIT_MS);
    }

    return () => {
      if (settleTimerId !== undefined) {
        window.clearTimeout(settleTimerId);
      }
      if (appearFallbackTimerId !== undefined) {
        window.clearTimeout(appearFallbackTimerId);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [target]);

  return isReady;
}
