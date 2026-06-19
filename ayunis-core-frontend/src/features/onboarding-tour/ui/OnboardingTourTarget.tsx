import type { TourTargetName } from '@/shared/config/tour-targets';
import type { ReactNode } from 'react';

interface OnboardingTourTargetProps {
  name: TourTargetName;
  children: ReactNode;
}

// The `data-tour` handle sits on this layout-transparent wrapper rather than a
// child element. Reaching into `firstElementChild` is unreliable: wrapped roots
// like Tooltip/Dialog/DropdownMenu/fragments don't guarantee the visible control
// is the first DOM node, so the spotlight can land on the wrong element. The
// wrapper already bounds exactly what's wrapped, so tagging it is deterministic.
export function OnboardingTourTarget({
  name,
  children,
}: Readonly<OnboardingTourTargetProps>) {
  return <div data-tour={name}>{children}</div>;
}
