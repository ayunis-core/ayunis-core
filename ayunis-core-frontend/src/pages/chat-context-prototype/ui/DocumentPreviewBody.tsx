import { useEffect, useRef } from 'react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  isAudio,
  isPaginated,
  isPlainText,
  type DocumentSourceHit,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';
import { KnowledgeBaseLink } from '@/pages/chat-context-prototype/ui/KnowledgeBaseLink';
import { PageSheet } from '@/pages/chat-context-prototype/ui/PageSheet';
import { SourceKindIcon } from '@/pages/chat-context-prototype/ui/SourceKindIcon';

const LAYOUT_SETTLE_MS = 600;

export function DocumentPreviewBody({
  hit,
  isCited,
}: Readonly<{ hit: SourceHit; isCited: boolean }>) {
  if (hit.kind === 'document' && isPaginated(hit)) {
    return <PagesBody hit={hit} isCited={isCited} />;
  }
  if (hit.kind === 'document' && isPlainText(hit)) {
    return <TextBody hit={hit} />;
  }
  return <NoPreviewBody hit={hit} />;
}

function NoPreviewBody({ hit }: Readonly<{ hit: SourceHit }>) {
  return (
    <div className="flex h-full items-center justify-center p-5">
      <Empty>
        <EmptyMedia variant="icon">
          <SourceKindIcon hit={hit} />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{kindLabel(hit)}</EmptyTitle>
          <EmptyDescription>
            <NoPreviewDescription hit={hit} />
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <KnowledgeBaseLink hit={hit} />
        </EmptyContent>
      </Empty>
    </div>
  );
}

function kindLabel(hit: SourceHit): string {
  if (hit.kind === 'web') return 'Webseite';
  if (isAudio(hit)) return 'Aufnahme';
  return 'Tabelle';
}

function NoPreviewDescription({ hit }: Readonly<{ hit: SourceHit }>) {
  if (hit.kind === 'web') {
    return (
      <>
        <a
          href={hit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {hit.url}
        </a>
        {hit.crawledPages !== undefined && (
          <span className="mt-1 block">
            {hit.crawledPages} Seiten eingelesen, inklusive Unterseiten.
          </span>
        )}
      </>
    );
  }
  if (isAudio(hit)) {
    return <>Ayunis Core arbeitet mit dem Transkript der Aufnahme.</>;
  }
  return <>Tabelle mit {hit.rowCount} Zeilen, ausgelesen und durchsuchbar.</>;
}

function TextBody({ hit }: Readonly<{ hit: DocumentSourceHit }>) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <span className="text-xs text-muted-foreground">
        Keine Seitenansicht — Ayunis Core arbeitet mit dem ausgelesenen Text
      </span>
      <div className="rounded-sm border bg-white px-6 py-6 shadow-sm">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
          {hit.extractedText ?? hit.passage}
        </p>
      </div>
    </div>
  );
}

function PagesBody({
  hit,
  isCited,
}: Readonly<{ hit: DocumentSourceHit; isCited: boolean }>) {
  const citedRef = useRef<HTMLDivElement | null>(null);
  const pages = Array.from({ length: hit.pageCount }, (_, index) => index + 1);

  useEffect(() => {
    const target = citedRef.current;
    if (!isCited || !target) return;
    const scroll = () => target.scrollIntoView({ block: 'start' });
    scroll();
    const observer = new ResizeObserver(scroll);
    observer.observe(target);
    const stop = setTimeout(() => observer.disconnect(), LAYOUT_SETTLE_MS);
    return () => {
      clearTimeout(stop);
      observer.disconnect();
    };
  }, [hit.id, isCited]);

  return (
    <div className="flex flex-col gap-4 p-5">
      {pages.map((page) => (
        <div
          key={page}
          ref={isCited && page === hit.page ? citedRef : undefined}
          className="scroll-mt-5 overflow-hidden rounded-sm border bg-white shadow-sm"
        >
          <PageSheet
            hit={hit}
            page={page}
            variant="full"
            showCitation={isCited}
          />
        </div>
      ))}
    </div>
  );
}
