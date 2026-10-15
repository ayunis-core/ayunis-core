import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  testId?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  testId,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto"
      data-testid={testId}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="mb-6 text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
