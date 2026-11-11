import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';

interface InboxListPagerProps {
  page: number;
  totalPages: number;
}

/** Compact paging for the narrow list column; keeps the open notification. */
export function InboxListPager({
  page,
  totalPages,
}: Readonly<InboxListPagerProps>) {
  const { t } = useTranslation('common');
  if (totalPages <= 1) return null;

  return (
    <div
      className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground"
      data-testid="inbox-pager"
    >
      <PagerLink
        page={page - 1}
        disabled={page <= 1}
        label={t('common.pagination.previous')}
      >
        <ChevronLeft />
      </PagerLink>
      <span>
        {page} / {totalPages}
      </span>
      <PagerLink
        page={page + 1}
        disabled={page >= totalPages}
        label={t('common.pagination.next')}
      >
        <ChevronRight />
      </PagerLink>
    </div>
  );
}

interface PagerLinkProps {
  page: number;
  disabled: boolean;
  label: string;
  children: ReactNode;
}

function PagerLink({
  page,
  disabled,
  label,
  children,
}: Readonly<PagerLinkProps>) {
  if (disabled) {
    return (
      <Button variant="ghost" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link
        to="."
        search={(prev) => ({ ...prev, page })}
        aria-label={label}
        title={label}
      >
        {children}
      </Link>
    </Button>
  );
}
