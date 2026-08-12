import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';

/**
 * Full-width alert strip for the top of the inset content panel. All app-level
 * banners share this one component so their chrome cannot drift apart.
 *
 * Rounding is positional, not baked in: only the first strip in the stack gets
 * the inset panel's top radius (`md:first:rounded-t-xl`), so a banner renders
 * correctly whether it sits alone or below another banner. The border is
 * bottom-only and inherits the tone's text colour, separating stacked strips
 * without doubling up.
 */

const TONES = {
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
} as const;

interface AppBannerStripProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'className' | 'role'
> {
  tone: keyof typeof TONES;
  children: ReactNode;
}

export default function AppBannerStrip({
  tone,
  children,
  ...props
}: Readonly<AppBannerStripProps>) {
  return (
    <div
      role="alert"
      className={cn(
        'relative grid w-full shrink-0 grid-cols-[calc(var(--spacing)*4)_1fr] items-center gap-x-3 rounded-none border-b px-4 py-2 text-sm backdrop-blur-md md:first:rounded-t-xl',
        TONES[tone],
      )}
      {...props}
    >
      <TriangleAlert className="size-4" />
      <p className="font-medium">{children}</p>
    </div>
  );
}
