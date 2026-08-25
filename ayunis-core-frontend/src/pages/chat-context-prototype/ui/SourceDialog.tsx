import { useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import { cn } from '@ayunis/ui/lib/cn';
import {
  SOURCE_HITS,
  type DocumentSourceHit,
} from '@/pages/chat-context-prototype/model/mock';
import { PageSheet } from '@/pages/chat-context-prototype/ui/PageSheet';

interface SourceDialogProps {
  sourceId: string | null;
  onClose: () => void;
}

export function SourceDialog({
  sourceId,
  onClose,
}: Readonly<SourceDialogProps>) {
  const hit = sourceId ? SOURCE_HITS[sourceId] : null;
  const documentHit = hit?.kind === 'document' ? hit : null;
  return (
    <Dialog
      open={documentHit !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className="flex h-[92vh] max-w-[min(1180px,95vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1180px,95vw)]"
        closeLabel="Schließen"
      >
        {documentHit && <DocumentReader hit={documentHit} />}
      </DialogContent>
    </Dialog>
  );
}

function DocumentReader({ hit }: Readonly<{ hit: DocumentSourceHit }>) {
  const [page, setPage] = useState(hit.page);
  const pages = Array.from({ length: hit.pageCount }, (_, index) => index + 1);

  return (
    <>
      <DialogHeader className="h-14 shrink-0 flex-row items-center justify-between gap-4 border-b px-4 pr-14">
        <DialogTitle className="truncate text-sm font-medium">
          {hit.title}
        </DialogTitle>
        <div className="flex shrink-0 items-center gap-1">
          {page !== hit.page && (
            <Button variant="ghost" size="sm" onClick={() => setPage(hit.page)}>
              <Crosshair />
              Zur Fundstelle
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Vorherige Seite"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {hit.pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Nächste Seite"
            disabled={page === hit.pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </DialogHeader>
      <div className="flex min-h-0 flex-1">
        <ScrollArea className="w-40 shrink-0 border-r bg-muted/30">
          <div className="flex flex-col gap-2 p-3">
            {pages.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setPage(entry)}
                aria-label={`Seite ${entry}`}
                className={cn(
                  'overflow-hidden rounded-sm border shadow-sm transition-all',
                  entry === page
                    ? 'border-brand ring-1 ring-brand'
                    : 'hover:border-muted-foreground/40',
                )}
              >
                <PageSheet hit={hit} page={entry} variant="thumb" />
              </button>
            ))}
          </div>
        </ScrollArea>
        <ScrollArea className="min-h-0 flex-1 bg-muted/40">
          <div className="mx-auto w-full max-w-[760px] p-8">
            <div className="overflow-hidden rounded-sm shadow-md">
              <PageSheet hit={hit} page={page} variant="full" />
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
