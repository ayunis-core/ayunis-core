import type { TourTargetName } from '@/shared/config/tour-targets';
import type { ReactNode } from 'react';

interface OnboardingTourTargetProps {
  name: TourTargetName;
  /**
   * Time in ms for the target to settle into place, for targets that animate in
   * (e.g. a page transition). The tour waits this long before measuring so the
   * spotlight lands on the settled position, not the pre-animation one. This is
   * the animation's delay + duration, not either one alone.
   */
  settleMs?: number;
  children: ReactNode;
}

// The `data-tour` handle sits on this layout-transparent wrapper rather than a
// child element. Reaching into `firstElementChild` is unreliable: wrapped roots
// like Tooltip/Dialog/DropdownMenu/fragments don't guarantee the visible control
// is the first DOM node, so the spotlight can land on the wrong element. The
// wrapper already bounds exactly what's wrapped, so tagging it is deterministic.
export function OnboardingTourTarget({
  name,
  settleMs,
  children,
}: Readonly<OnboardingTourTargetProps>) {
  return (
    <div data-tour={name} data-tour-settle={settleMs}>
      {children}
    </div>
  );
}
