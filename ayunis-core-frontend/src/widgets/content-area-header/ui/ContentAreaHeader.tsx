import { Fragment, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { SidebarTrigger } from '@ayunis/ui/components/sidebar';
import { Separator } from '@ayunis/ui/components/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ayunis/ui/components/breadcrumb';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
  search?: Record<string, unknown>;
}

interface ContentAreaHeaderProps {
  breadcrumbs: BreadcrumbEntry[];
  action?: ReactNode;
  badge?: ReactNode;
}

interface HeaderClasses {
  header: string;
  actions: string;
}

const WEB_CLASSES: HeaderClasses = {
  header:
    'flex min-h-9 w-full items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-2',
  actions:
    'content-area-header-actions flex min-w-0 shrink-0 flex-wrap items-center gap-2 empty:hidden max-sm:w-full max-sm:justify-end',
};

// The pane is always narrower than `sm`, so the web header would stack its
// actions under the title; the pane keeps both on one row.
const EMBEDDED_CLASSES: HeaderClasses = {
  header: 'flex min-h-9 w-full items-center justify-between gap-2',
  actions:
    'content-area-header-actions flex min-w-0 shrink-0 items-center gap-1 empty:hidden',
};

export default function ContentAreaHeader({
  breadcrumbs,
  action,
  badge,
}: Readonly<ContentAreaHeaderProps>) {
  const isEmbedded = useEmbedded();
  const classes = isEmbedded ? EMBEDDED_CLASSES : WEB_CLASSES;
  // The pane is too narrow for the trail; its history button leads back.
  const shownCrumbs = isEmbedded ? breadcrumbs.slice(-1) : breadcrumbs;

  return (
    <header className={classes.header}>
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:pl-2">
        {!isEmbedded && (
          <div className="flex items-center gap-2 lg:hidden">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </div>
        )}
        <Breadcrumb>
          <BreadcrumbList>
            {shownCrumbs.map((crumb, index) => {
              const isLast = index === shownCrumbs.length - 1;
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
                        <Link to={crumb.href} search={crumb.search as never}>
                          {crumb.label}
                        </Link>
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
      {action && <div className={classes.actions}>{action}</div>}
    </header>
  );
}
