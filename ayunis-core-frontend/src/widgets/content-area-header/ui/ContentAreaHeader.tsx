import type { ReactNode } from 'react';
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
    <header className="flex items-center justify-between h-10">
      <div className="flex items-center gap-2">
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
                <BreadcrumbItem key={crumb.label}>
                  {isLast ? (
                    <>
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      {badge}
                    </>
                  ) : (
                    <>
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  );
}
