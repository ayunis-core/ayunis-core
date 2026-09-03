import type { ReactNode } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import type { PanelFrame } from '@/widgets/prototype-journey/model/journey';

export function PanelSurface({
  frame,
  children,
}: Readonly<{ frame: PanelFrame; children: ReactNode }>) {
  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        frame === 'fill' && 'rounded-xl bg-muted/40',
        frame === 'stroke' && 'rounded-xl border',
        frame === 'divider' && 'border-l',
      )}
    >
      {children}
    </div>
  );
}

export function PanelRail({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="w-full min-w-0 pb-6 pr-3 pt-2">{children}</div>;
}
