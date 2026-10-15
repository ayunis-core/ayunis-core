import type { ReactNode } from 'react';
import { ItemGroup } from '@ayunis/ui/components/item';

export function ListSection({
  title,
  count,
  action,
  testId,
  children,
}: Readonly<{
  title: string;
  count?: number;
  action?: ReactNode;
  testId?: string;
  children: ReactNode;
}>) {
  const heading = (
    <h2 className="text-sm font-medium">
      {title}
      {count !== undefined && (
        <span className="ml-2 font-normal tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </h2>
  );

  return (
    <section className="space-y-2" data-testid={testId}>
      {action ? (
        <div className="flex items-center justify-between gap-2">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      <ItemGroup className="gap-2">{children}</ItemGroup>
    </section>
  );
}
