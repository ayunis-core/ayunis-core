import { useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ALL_SOURCE_HITS } from '@/pages/chat-context-prototype/model/mock';
import { PageSheet } from '@/pages/chat-context-prototype/ui/PageSheet';

interface DocumentPreviewPaneProps {
  documentId: string;
  onExpand: () => void;
}

export function DocumentPreviewPane({
  documentId,
  onExpand,
}: Readonly<DocumentPreviewPaneProps>) {
  const hit = ALL_SOURCE_HITS[documentId];
  const citedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    citedRef.current?.scrollIntoView({ block: 'start' });
  }, [documentId]);

  if (hit.kind !== 'document') return null;
  const pages = Array.from({ length: hit.pageCount }, (_, index) => index + 1);

  return (
    <div className="flex animate-in flex-col fade-in-0 duration-200">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-2 bg-background/70 px-5 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-medium">{hit.title}</h3>
          <span className="text-xs text-muted-foreground">
            {hit.pageCount} Seiten · Fundstelle auf {hit.location}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Groß anzeigen"
          onClick={onExpand}
        >
          <Maximize2 />
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {pages.map((page) => (
          <div
            key={page}
            ref={page === hit.page ? citedRef : undefined}
            className="overflow-hidden rounded-sm border shadow-sm"
          >
            <PageSheet hit={hit} page={page} variant="full" />
          </div>
        ))}
      </div>
    </div>
  );
}
