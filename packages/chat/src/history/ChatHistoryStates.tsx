import type { ReactNode } from 'react';
import { Button } from '@ayunis/ui/components/button';

export function ChatHistoryEmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-6 max-w-md text-balance text-muted-foreground">
        {description}
      </p>
      {action && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}

export function ChatHistoryLoading({ label }: Readonly<{ label: string }>) {
  return (
    <p role="status" className="p-4">
      {label}
    </p>
  );
}

export function ChatHistoryError({
  message,
  retryLabel,
  onRetry,
}: Readonly<{
  message: string;
  retryLabel: string;
  onRetry: () => void;
}>) {
  return (
    <div className="space-y-2 p-4">
      <p role="alert" className="text-sm text-destructive">
        {message}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
