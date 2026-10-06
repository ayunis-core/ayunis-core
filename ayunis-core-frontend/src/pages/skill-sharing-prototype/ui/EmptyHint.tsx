import type { ReactNode } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';

export function EmptyHint({
  icon,
  title,
  description,
}: Readonly<{ icon: ReactNode; title: string; description?: string }>) {
  return (
    <Empty>
      <EmptyMedia variant="icon">{icon}</EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}
