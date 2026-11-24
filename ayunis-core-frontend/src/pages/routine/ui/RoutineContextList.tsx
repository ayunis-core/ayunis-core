import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Separator } from '@ayunis/ui/components/separator';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { cn } from '@ayunis/ui/lib/cn';

export interface RoutineContextRow {
  id: string;
  title: ReactNode;
  description?: string | null;
  control: ReactNode;
}

/** A tab's rows, or its loading, error and empty states. */
export function RoutineContextList({
  rows,
  isLoading,
  isError,
  onRetry,
  emptyText,
}: Readonly<{
  rows: RoutineContextRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyText: string;
}>) {
  const { t } = useTranslation('routines');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <p className="text-sm text-destructive">
          {t('detail.context.loadError')}
        </p>
        <Button variant="link" onClick={onRetry}>
          {t('detail.context.retry')}
        </Button>
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div>
      {rows.map((row, index) => (
        <div key={row.id}>
          {index > 0 && <Separator className="my-3" />}
          <Item
            className={cn(
              'px-0',
              index === 0 && 'pt-0',
              index === rows.length - 1 && 'pb-0',
            )}
          >
            <ItemContent>
              <ItemTitle>{row.title}</ItemTitle>
              {row.description && (
                <ItemDescription>{row.description}</ItemDescription>
              )}
            </ItemContent>
            <ItemActions>{row.control}</ItemActions>
          </Item>
        </div>
      ))}
    </div>
  );
}
