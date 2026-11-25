import type { ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@ayunis/ui/components/breadcrumb';

export function PaneHeading({
  title,
  actions,
  badge,
}: Readonly<{ title: string; actions?: ReactNode; badge?: ReactNode }>) {
  return (
    <header className="flex min-h-9 w-full items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:pl-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
              {badge}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {actions && (
        <div className="content-area-header-actions flex min-w-0 shrink-0 items-center gap-1 empty:hidden">
          {actions}
        </div>
      )}
    </header>
  );
}
