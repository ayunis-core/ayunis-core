import type { LucideIcon } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';

interface EmptyStateHeroProps {
  icon: LucideIcon;
}

export function EmptyStateHero({ icon: Icon }: Readonly<EmptyStateHeroProps>) {
  return (
    <div className="relative mb-6 h-24 w-56" aria-hidden="true">
      <div className="absolute -inset-x-10 -inset-y-8 bg-radial from-brand/20 to-transparent to-70%" />
      <GhostCard className="-translate-x-14 -rotate-6" />
      <GhostCard className="translate-x-14 rotate-6" />
      <div className="absolute inset-0 m-auto flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-brand to-brand/70 text-brand-foreground shadow-xl ring-4 ring-background">
        <Icon className="size-9" strokeWidth={1.75} />
      </div>
    </div>
  );
}

function GhostCard({ className }: Readonly<{ className: string }>) {
  return (
    <div
      className={cn(
        'absolute inset-0 m-auto flex h-20 w-28 flex-col gap-2 rounded-xl border bg-card p-3 opacity-80 shadow-sm',
        className,
      )}
    >
      <div className="h-2 w-2/3 rounded-full bg-muted-foreground/20" />
      <div className="h-2 w-full rounded-full bg-muted" />
      <div className="h-2 w-4/5 rounded-full bg-muted" />
    </div>
  );
}
