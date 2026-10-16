import type { ReactNode } from 'react';
import { ItemGroup } from '@ayunis/ui/components/item';

export function ListSection({
  title,
  count,
  testId,
  children,
}: Readonly<{
  title: string;
  count: number;
  testId?: string;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <h2 className="text-sm font-medium">
        {title}
        <span className="ml-2 font-normal tabular-nums text-muted-foreground">
          {count}
        </span>
      </h2>
      <ItemGroup className="gap-2">{children}</ItemGroup>
    </section>
  );
}
