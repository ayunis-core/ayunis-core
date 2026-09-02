import { AlertCircle, Loader2, Maximize2 } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  ALL_SOURCE_HITS,
  isPaginated,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';
import {
  DocumentPreviewBody,
  ExternalLinkButton,
} from '@/pages/chat-context-prototype/ui/DocumentPreviewBody';

interface DocumentPreviewPaneProps {
  documentId: string;
  isCited: boolean;
  onExpand: () => void;
}

export function DocumentPreviewPane({
  documentId,
  isCited,
  onExpand,
}: Readonly<DocumentPreviewPaneProps>) {
  const hit = ALL_SOURCE_HITS[documentId];
  const canExpand =
    hit.kind === 'document' && isPaginated(hit) && hit.status === undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-2 px-5 py-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-medium">{hit.title}</h3>
          <span className="truncate text-xs text-muted-foreground">
            {subline(hit, isCited)}
          </span>
        </div>
        {canExpand && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Groß anzeigen"
                onClick={onExpand}
              >
                <Maximize2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Groß anzeigen</TooltipContent>
          </Tooltip>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <PreviewBody hit={hit} isCited={isCited} />
      </ScrollArea>
    </div>
  );
}

function subline(hit: SourceHit, isCited: boolean): string {
  const parts: string[] = [];
  if (hit.kind === 'web') {
    parts.push(hit.siteName, hit.retrievedAt);
  } else if (isPaginated(hit)) {
    parts.push(`${hit.pageCount} Seiten`);
    if (isCited) parts.push(`Fundstelle auf ${hit.location}`);
  } else {
    parts.push(hit.location);
  }
  if (hit.createdBy === 'llm') parts.push('Von Ayunis Core hinzugefügt');
  return parts.join(' · ');
}

function PreviewBody({
  hit,
  isCited,
}: Readonly<{ hit: SourceHit; isCited: boolean }>) {
  if (hit.status === 'processing') {
    return (
      <StatusState
        icon={<Loader2 className="animate-spin" />}
        title="Wird verarbeitet"
        description="Sobald die Verarbeitung abgeschlossen ist, kann Ayunis Core diese Quelle nutzen."
      />
    );
  }
  if (hit.status === 'failed') {
    return (
      <StatusState
        icon={<AlertCircle />}
        title="Verarbeitung fehlgeschlagen"
        description={
          hit.processingError ??
          'Diese Quelle konnte nicht ausgelesen werden und wird nicht durchsucht.'
        }
        action={
          hit.kind === 'web' ? (
            <ExternalLinkButton url={hit.url} />
          ) : (
            <Badge variant="outline">Neu hochladen erforderlich</Badge>
          )
        }
      />
    );
  }
  return <DocumentPreviewBody hit={hit} isCited={isCited} />;
}

function StatusState({
  icon,
  title,
  description,
  action,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex h-full items-center justify-center p-5">
      <Empty>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {action}
      </Empty>
    </div>
  );
}
