import type { ReactNode } from 'react';
import { cn } from '@ayunis/ui/lib/cn';

interface SettingsFieldRowProps {
  children: ReactNode;
  className?: string;
}

export function SettingsFieldRow({
  children,
  className,
}: Readonly<SettingsFieldRowProps>) {
  return (
    <div
      data-testid="settings-field-row"
      className={cn(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
