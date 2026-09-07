import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@ayunis/ui/components/input';
import { cn } from '@ayunis/ui/lib/cn';

export function ListToolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-2 sm:w-auto',
        className,
      )}
      {...props}
    />
  );
}

export function ListToolbarSearch({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={props.placeholder}
        {...props}
        // Compact height is intentional; preserve Input's mobile font to avoid iOS zoom.
        className={cn('h-8 w-full pl-8', className)}
      />
    </div>
  );
}
