import { cn } from '@ayunis/ui/lib/cn';
import type { DocumentSourceHit } from '@/pages/chat-context-prototype/model/mock';

const BASE_LINES = [96, 88, 92, 70, 94, 84, 90, 62];

function linesForPage(page: number, offset: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => {
    const base = BASE_LINES[(page + offset + index) % BASE_LINES.length];
    return base - ((page * 5 + index * 7) % 14);
  });
}

interface PageSheetProps {
  hit: DocumentSourceHit;
  page: number;
  variant: 'thumb' | 'full';
  showCitation?: boolean;
}

export function PageSheet({
  hit,
  page,
  variant,
  showCitation = true,
}: Readonly<PageSheetProps>) {
  const isSourcePage = showCitation && page === hit.page;
  const isThumb = variant === 'thumb';

  return (
    <div
      className={cn(
        'flex aspect-[1/1.414] w-full flex-col overflow-hidden bg-white',
        isThumb ? 'px-3 py-4' : 'px-14 py-16',
      )}
    >
      <p
        className={cn(
          'font-semibold text-neutral-700',
          isThumb ? 'mb-1.5 text-[5px]' : 'mb-5 text-sm',
        )}
      >
        {isSourcePage ? hit.heading : hit.title.split('.')[0]}
      </p>
      <PlaceholderLines
        widths={linesForPage(page, 0, isSourcePage ? 5 : 12)}
        isThumb={isThumb}
      />
      {isSourcePage && (
        <p
          className={cn(
            'border-l-2 border-brand bg-brand/15 text-neutral-800',
            isThumb
              ? 'my-1.5 py-1 pl-1 text-[5px] leading-[1.6]'
              : 'my-5 py-2.5 pl-4 text-sm leading-relaxed',
          )}
        >
          {hit.passage}
        </p>
      )}
      <PlaceholderLines
        widths={linesForPage(page, 3, isSourcePage ? 12 : 14)}
        isThumb={isThumb}
      />
      <p
        className={cn(
          'mt-auto pt-3 text-right text-neutral-400',
          isThumb ? 'text-[5px]' : 'text-xs',
        )}
      >
        {page}
      </p>
    </div>
  );
}

function PlaceholderLines({
  widths,
  isThumb,
}: Readonly<{ widths: number[]; isThumb: boolean }>) {
  return (
    <div className={cn('flex flex-col', isThumb ? 'gap-[3px]' : 'gap-2.5')}>
      {widths.map((width, index) => (
        <div
          key={`${width}-${index}`}
          className={cn(
            'rounded-full bg-neutral-200',
            isThumb ? 'h-[2px]' : 'h-2',
          )}
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}
