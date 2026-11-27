import type { ReactNode } from 'react';

// The composer's entrance (a 200 ms delay plus a 700 ms lift) must finish
// before the tour measures a target inside it.
const COMPOSER_SETTLE_MS = 900;

/**
 * Marks a control for the host's onboarding tour. The handle sits on a
 * wrapper because tooltip and menu roots don't guarantee that the visible
 * control is their first DOM node.
 */
export function TourTarget({
  name,
  settles,
  children,
}: Readonly<{ name?: string; settles?: boolean; children: ReactNode }>) {
  if (!name) return <>{children}</>;
  return (
    <div
      data-tour={name}
      data-tour-settle={settles ? COMPOSER_SETTLE_MS : undefined}
    >
      {children}
    </div>
  );
}
