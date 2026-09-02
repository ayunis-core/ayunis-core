import { useEffect, useRef } from 'react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { ExternalLink } from 'lucide-react';
import {
  isAudio,
  isPaginated,
  isTabular,
  type DocumentSourceHit,
  type SourceHit,
  type WebSourceHit,
} from '@/pages/chat-context-prototype/model/mock';
import { PageSheet } from '@/pages/chat-context-prototype/ui/PageSheet';

export function DocumentPreviewBody({
  hit,
  isCited,
}: Readonly<{ hit: SourceHit; isCited: boolean }>) {
  if (hit.kind === 'web') return <WebBody hit={hit} />;
  if (isTabular(hit)) return <TabularBody hit={hit} />;
  if (!isPaginated(hit)) return <TextBody hit={hit} />;
  return <PagesBody hit={hit} isCited={isCited} />;
}

function Sheet({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border bg-white px-6 py-6 shadow-sm">
      {children}
    </div>
  );
}

function Note({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

function WebBody({ hit }: Readonly<{ hit: WebSourceHit }>) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <Note>{webNote(hit)}</Note>
      <Sheet>
        {(hit.body ?? [hit.passage]).map((paragraph, index) => (
          <p
            key={paragraph}
            className={
              index === 0
                ? 'text-sm font-medium text-neutral-800'
                : 'text-sm leading-relaxed text-neutral-700'
            }
          >
            {paragraph}
          </p>
        ))}
      </Sheet>
      <ExternalLinkButton url={hit.url} />
    </div>
  );
}

function webNote(hit: WebSourceHit): string {
  if (hit.crawledFrom) {
    return `Unterseite von ${hit.crawledFrom} — beim Einlesen mitgefunden`;
  }
  if (hit.crawlDepth) {
    return `Webseite — mit ${hit.crawlDepth} Ebene Unterseiten eingelesen`;
  }
  return 'Webseite — Ayunis Core arbeitet mit dem eingelesenen Text';
}

function TabularBody({ hit }: Readonly<{ hit: DocumentSourceHit }>) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <Note>
        Tabelle mit {hit.rowCount} Zeilen — Ayunis Core wertet die Werte direkt
        aus, es gibt keine Seitenansicht
      </Note>
      <Sheet>
        <span className="text-sm font-medium text-neutral-800">Spalten</span>
        <div className="flex flex-wrap gap-1.5">
          {(hit.columns ?? []).map((column) => (
            <Badge key={column} variant="outline">
              {column}
            </Badge>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function TextBody({ hit }: Readonly<{ hit: DocumentSourceHit }>) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <Note>
        {isAudio(hit)
          ? 'Aufnahme — Ayunis Core arbeitet mit dem Transkript'
          : 'Keine Seitenansicht — Ayunis Core arbeitet mit dem ausgelesenen Text'}
      </Note>
      <Sheet>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
          {hit.extractedText ?? hit.passage}
        </p>
      </Sheet>
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
    if (isCited) citedRef.current?.scrollIntoView({ block: 'start' });
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

export function ExternalLinkButton({ url }: Readonly<{ url: string }>) {
  return (
    <Button variant="outline" size="sm" className="w-fit" asChild>
      <a href={url} target="_blank" rel="noreferrer">
        <ExternalLink />
        Seite aufrufen
      </a>
    </Button>
  );
}
