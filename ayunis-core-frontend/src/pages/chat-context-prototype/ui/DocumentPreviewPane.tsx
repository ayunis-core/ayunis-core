import { AlertCircle, ChevronLeft, Loader2, Maximize2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  ALL_SOURCE_HITS,
  isPaginated,
  isPlainText,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';
import { DocumentPreviewBody } from '@/pages/chat-context-prototype/ui/DocumentPreviewBody';
import { KnowledgeBaseLink } from '@/pages/chat-context-prototype/ui/KnowledgeBaseLink';

interface DocumentPreviewPaneProps {
  documentId: string;
  isCited: boolean;
  onExpand: () => void;
  onBack?: () => void;
}

export function DocumentPreviewPane({
  documentId,
  isCited,
  onExpand,
  onBack,
}: Readonly<DocumentPreviewPaneProps>) {
  const hit = ALL_SOURCE_HITS[documentId];
  const canExpand =
    hit.kind === 'document' && isPaginated(hit) && hit.status === undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          'flex shrink-0 items-start justify-between gap-2 py-3 pr-5',
          onBack ? 'pl-2' : 'pl-5',
        )}
      >
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zurück"
            onClick={onBack}
          >
            <ChevronLeft />
          </Button>
        )}
        <div className="mr-auto flex min-w-0 flex-col">
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
  } else if (isPlainText(hit)) {
    parts.push(hit.location);
  }
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
        action={<KnowledgeBaseLink hit={hit} />}
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
        action={<KnowledgeBaseLink hit={hit} />}
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
        {action && <EmptyContent>{action}</EmptyContent>}
      </Empty>
    </div>
  );
}
