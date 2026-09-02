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
  if (hit.kind !== 'document') return null;
  return (
    <div className="flex animate-in flex-col gap-3 fade-in-0 duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-medium">{hit.title}</h3>
          <span className="text-xs text-muted-foreground">
            {hit.pageCount} Seiten
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
      <div className="overflow-hidden rounded-sm border shadow-sm">
        <PageSheet hit={hit} page={hit.page} variant="full" />
      </div>
    </div>
  );
}
