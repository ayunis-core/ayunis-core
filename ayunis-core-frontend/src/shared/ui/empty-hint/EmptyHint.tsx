import type { ReactNode } from 'react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';

export function EmptyHint({
  icon,
  title,
  description,
  action,
  testId,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}>) {
  return (
    <Empty data-testid={testId}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
