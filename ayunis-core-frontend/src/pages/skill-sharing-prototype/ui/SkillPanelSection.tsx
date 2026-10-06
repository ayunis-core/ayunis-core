import type { ReactNode } from 'react';
import { ItemGroup } from '@ayunis/ui/components/item';

export function SkillPanelSection({
  title,
  count,
  action,
  children,
}: Readonly<{
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {title}
          {count !== undefined && (
            <span className="ml-2 font-normal tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      <ItemGroup className="gap-2">{children}</ItemGroup>
    </section>
  );
}
