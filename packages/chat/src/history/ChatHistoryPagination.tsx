import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, buttonVariants } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@ayunis/ui/components/pagination';

function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page += 1
  ) {
    pages.push(page);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function ChatHistoryPagination({
  currentPage,
  totalPages,
  onPage,
  renderControl,
  testIdPrefix = 'chat-history',
}: Readonly<{
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
  renderControl?: ChatHistoryPaginationControlRenderer;
  testIdPrefix?: string;
}>) {
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PageControl
          direction="previous"
          page={currentPage - 1}
          disabled={currentPage === 1}
          renderControl={renderControl}
          testIdPrefix={testIdPrefix}
          onClick={() => onPage(currentPage - 1)}
        />
        <PageLinks
          currentPage={currentPage}
          totalPages={totalPages}
          renderControl={renderControl}
          onPage={onPage}
        />
        <PageControl
          direction="next"
          page={currentPage + 1}
          disabled={currentPage === totalPages}
          renderControl={renderControl}
          testIdPrefix={testIdPrefix}
          onClick={() => onPage(currentPage + 1)}
        />
      </PaginationContent>
    </Pagination>
  );
}

function PageLinks({
  currentPage,
  totalPages,
  renderControl,
  onPage,
}: Readonly<{
  currentPage: number;
  totalPages: number;
  renderControl?: ChatHistoryPaginationControlRenderer;
  onPage: (page: number) => void;
}>) {
  return pageNumbers(currentPage, totalPages).map((page, index) =>
    page === 'ellipsis' ? (
      <PaginationItem key={`ellipsis-${index}`}>
        <PaginationEllipsis />
      </PaginationItem>
    ) : (
      <PaginationItem key={page}>
        <PaginationControl
          control={{
            page,
            current: page === currentPage,
            variant: page === currentPage ? 'outline' : 'ghost',
            size: 'icon',
            children: page,
            onSelect: () => onPage(page),
          }}
          renderControl={renderControl}
        />
      </PaginationItem>
    ),
  );
}

function PageControl({
  direction,
  page,
  disabled,
  renderControl,
  testIdPrefix,
  onClick,
}: Readonly<{
  direction: 'previous' | 'next';
  page: number;
  disabled: boolean;
  renderControl?: ChatHistoryPaginationControlRenderer;
  testIdPrefix: string;
  onClick: () => void;
}>) {
  const { t } = useTranslation('common');
  const previous = direction === 'previous';
  const label = previous ? 'Go to previous page' : 'Go to next page';
  return (
    <PaginationItem>
      <PaginationControl
        control={{
          page,
          disabled,
          label,
          testId: `${testIdPrefix}-${direction}`,
          variant: 'ghost',
          className: previous
            ? 'gap-1 px-2.5 sm:pl-2.5'
            : 'gap-1 px-2.5 sm:pr-2.5',
          children: (
            <>
              {previous && <ChevronLeft />}
              <span className="hidden sm:block">
                {t(`common.pagination.${direction}`)}
              </span>
              {!previous && <ChevronRight />}
            </>
          ),
          onSelect: onClick,
        }}
        renderControl={renderControl}
      />
    </PaginationItem>
  );
}

type ControlVariant = 'ghost' | 'outline';

export interface ChatHistoryPaginationControl {
  page: number;
  children: ReactNode;
  className?: string;
  current?: boolean;
  disabled?: boolean;
  label?: string;
  onSelect: () => void;
  size?: 'default' | 'icon';
  testId?: string;
  variant: ControlVariant;
}

export type ChatHistoryPaginationControlRenderer = (
  control: ChatHistoryPaginationControl,
) => ReactNode;

function PaginationControl({
  control,
  renderControl,
}: Readonly<{
  control: ChatHistoryPaginationControl;
  renderControl?: ChatHistoryPaginationControlRenderer;
}>): ReactNode {
  if (renderControl) {
    return (
      <>
        {renderControl({
          ...control,
          className: cn(
            buttonVariants({
              variant: control.variant,
              size: control.size ?? 'default',
            }),
            control.className,
            control.disabled && 'pointer-events-none opacity-50',
          ),
        })}
      </>
    );
  }
  return (
    <Button
      type="button"
      variant={control.variant}
      size={control.size}
      className={control.className}
      disabled={control.disabled}
      aria-current={control.current ? 'page' : undefined}
      aria-label={control.label}
      data-testid={control.testId}
      onClick={control.onSelect}
    >
      {control.children}
    </Button>
  );
}
