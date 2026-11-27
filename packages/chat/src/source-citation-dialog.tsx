import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import type { SourceCitationResponseDto } from '@ayunis/api-client/schemas';
import { useThreadSourceCitationsControllerGetSourceCitation } from '@ayunis/api-client/endpoints';
import { Markdown, type SourceCitation } from '@ayunis/chat/markdown';
import type { ChatEvents } from './chat-config';
import { RecordingCitationDetails } from './recording-citation-details';

interface SourceCitationDialogProps {
  readonly threadId: string;
  readonly selectedCitation: SourceCitation;
  readonly events: ChatEvents;
  readonly onClose: () => void;
}

export function SourceCitationDialog({
  threadId,
  selectedCitation,
  events,
  onClose,
}: SourceCitationDialogProps) {
  const { t } = useTranslation('chat');
  const query = useThreadSourceCitationsControllerGetSourceCitation(
    threadId,
    selectedCitation.chunkId,
  );
  const citation = query.data ?? null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="source-citation-dialog"
        size="wide"
        closeLabel={t('chat.sourceCitation.close')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {citation?.recording?.name ??
              citation?.source.name ??
              t('chat.sourceCitation.title')}
          </DialogTitle>
        </DialogHeader>
        <CitationDialogBody
          citation={citation}
          isLoading={query.isLoading}
          error={query.error}
          events={events}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CitationDialogBodyProps {
  readonly citation: SourceCitationResponseDto | null;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly events: ChatEvents;
}

function CitationDialogBody({
  citation,
  isLoading,
  error,
  events,
}: CitationDialogBodyProps) {
  const { t } = useTranslation('chat');
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('chat.sourceCitation.loading')}</span>
      </div>
    );
  }
  if (error || !citation) {
    return (
      <p
        data-testid="source-citation-error"
        className="py-12 text-center text-sm text-muted-foreground"
      >
        {t('chat.sourceCitation.unavailable')}
      </p>
    );
  }
  return <CitationContent citation={citation} events={events} />;
}

function CitationContent({
  citation,
  events,
}: Readonly<{ citation: SourceCitationResponseDto; events: ChatEvents }>) {
  const { t } = useTranslation('chat');

  return (
    <div
      data-testid="source-citation-scroll-area"
      className="min-w-0 w-full max-h-[70vh] overflow-y-auto pr-4"
    >
      <div className="min-w-0 space-y-6">
        {citation.recording ? (
          <RecordingCitationDetails
            recording={citation.recording}
            events={events}
          />
        ) : (
          <SourceDetails citation={citation} />
        )}
        <section className="space-y-2">
          <h3 className="font-medium">{t('chat.sourceCitation.excerpt')}</h3>
          <div
            data-testid="source-citation-excerpt"
            className="rounded-md border border-brand/20 bg-brand/10 p-4"
          >
            {citation.recording?.position === 'transcript' ? (
              <p className="whitespace-pre-wrap text-sm">
                {citation.chunk.content}
              </p>
            ) : (
              <Markdown
                renderImages={false}
                className="[&_:is(h1,h2,h3,h4,h5,h6)]:text-[length:inherit]!"
              >
                {citation.chunk.content}
              </Markdown>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SourceDetails({
  citation,
}: Readonly<{ citation: SourceCitationResponseDto }>) {
  const safeUrl = getSafeHttpUrl(citation.source.url);

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-brand underline underline-offset-4"
        >
          {citation.source.url}
        </a>
      )}
      <LineMetadata
        startLine={citation.chunk.startLine}
        endLine={citation.chunk.endLine}
      />
    </div>
  );
}

function LineMetadata({
  startLine,
  endLine,
}: Readonly<{ startLine: number | null; endLine: number | null }>) {
  const { t } = useTranslation('chat');
  if (startLine === null && endLine === null) return null;
  if (startLine !== null && endLine !== null && startLine !== endLine) {
    return (
      <p>
        {t('chat.sourceCitation.lines', { start: startLine, end: endLine })}
      </p>
    );
  }
  return <p>{t('chat.sourceCitation.line', { line: startLine ?? endLine })}</p>;
}

function getSafeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null;
  } catch {
    return null;
  }
}
