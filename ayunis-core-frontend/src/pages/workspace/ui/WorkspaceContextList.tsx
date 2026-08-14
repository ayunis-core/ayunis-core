import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';

export const CONTEXT_PAGE_SIZE = 20;

export function WorkspaceContextPagination({
  page,
  total,
  limit = CONTEXT_PAGE_SIZE,
  testId,
  onPageChange,
}: Readonly<{
  page: number;
  total: number;
  limit?: number;
  testId: string;
  onPageChange: (page: number) => void;
}>) {
  const { t } = useTranslation('common');
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        data-testid={`${testId}-previous`}
        disabled={page === 1}
        aria-label={t('common.pagination.previous')}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
        <span className="hidden sm:inline">
          {t('common.pagination.previous')}
        </span>
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        data-testid={`${testId}-next`}
        disabled={page === totalPages}
        aria-label={t('common.pagination.next')}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="hidden sm:inline">{t('common.pagination.next')}</span>
        <ChevronRight />
      </Button>
    </div>
  );
}

export function WorkspaceContextSection({
  title,
  description,
  action,
  children,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function WorkspaceContextItem({
  icon,
  title,
  description,
  action,
  testId,
}: Readonly<{
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action: ReactNode;
  testId?: string;
}>) {
  return (
    <Item variant="outline" data-testid={testId}>
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
      <ItemActions>{action}</ItemActions>
    </Item>
  );
}

export function WorkspaceContextEmpty({
  icon,
  title,
  description,
  action,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <Empty>
      <EmptyMedia variant="icon">{icon}</EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

export function RemoveButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
      <Trash className="text-destructive" />
    </Button>
  );
}
