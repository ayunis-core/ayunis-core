import type { TourTargetName } from '@/widgets/onboarding/config/tour-targets';

/**
 * Whether a spotlight can land on the target right now. Presence in the DOM is
 * not enough: a collapsed sidebar keeps its rows mounted but hidden or
 * translated off-screen, and joyride would stall on them until its timeout.
 */
export function isTourTargetVisible(target: TourTargetName): boolean {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!(el instanceof HTMLElement)) return false;
  if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight
  );
}
