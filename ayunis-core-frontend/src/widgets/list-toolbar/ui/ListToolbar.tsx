import type { ComponentProps } from 'react';
import type { Input } from '@ayunis/ui/components/input';
import { cn } from '@ayunis/ui/lib/cn';
import { SearchField } from '@/shared/ui/search-field';

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
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
  type: _type,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <SearchField
      leadingIcon
      iconClassName="left-2"
      wrapperClassName="min-w-0 flex-1 sm:w-48 sm:flex-none"
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      value={typeof value === 'string' ? value : ''}
      onChange={onChange ?? (() => undefined)}
      // Compact height is intentional; preserve Input's mobile font to avoid iOS zoom.
      className={cn('h-8 w-full pl-8', className)}
      {...props}
    />
  );
}
