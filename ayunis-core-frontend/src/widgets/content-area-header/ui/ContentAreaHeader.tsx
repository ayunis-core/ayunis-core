import { Fragment, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { SidebarTrigger } from '@/shared/ui/shadcn/sidebar';
import { Separator } from '@/shared/ui/shadcn/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/shadcn/breadcrumb';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface ContentAreaHeaderProps {
  breadcrumbs: BreadcrumbEntry[];
  action?: ReactNode;
  badge?: ReactNode;
}

export default function ContentAreaHeader({
  breadcrumbs,
  action,
  badge,
}: Readonly<ContentAreaHeaderProps>) {
  return (
    <header className="flex min-h-9 w-full items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:pl-2">
        <div className="flex items-center gap-2 lg:hidden">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
        </div>
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={crumb.label}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <>
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        {badge}
                      </>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </header>
  );
}
