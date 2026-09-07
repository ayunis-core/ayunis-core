import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import type { SourceCitationResponseDto } from '@/shared/api';
import { useSourceCitation } from '@/pages/chat/api/useSourceCitation';
import { Markdown } from '@/widgets/markdown';
import type { SourceCitation } from '@/widgets/markdown';

interface SourceCitationDialogProps {
  readonly threadId: string;
  readonly selectedCitation: SourceCitation;
  readonly onClose: () => void;
}

export default function SourceCitationDialog({
  threadId,
  selectedCitation,
  onClose,
}: SourceCitationDialogProps) {
  const { t } = useTranslation('chat');
  const { citation, isLoading, error } = useSourceCitation(
    threadId,
    selectedCitation.chunkId,
  );

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
            {citation?.source.name ?? t('chat.sourceCitation.title')}
          </DialogTitle>
        </DialogHeader>
        <CitationDialogBody
          citation={citation}
          isLoading={isLoading}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CitationDialogBodyProps {
  readonly citation: SourceCitationResponseDto | null;
  readonly isLoading: boolean;
  readonly error: unknown;
}

function CitationDialogBody({
  citation,
  isLoading,
  error,
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
  return <CitationContent citation={citation} />;
}

function CitationContent({
  citation,
}: Readonly<{ citation: SourceCitationResponseDto }>) {
  const { t } = useTranslation('chat');
  const safeUrl = getSafeHttpUrl(citation.source.url);

  return (
    <div
      data-testid="source-citation-scroll-area"
      className="min-w-0 w-full max-h-[70vh] overflow-y-auto pr-4"
    >
      <div className="min-w-0 space-y-6">
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
        <section className="space-y-2">
          <h3 className="font-medium">{t('chat.sourceCitation.excerpt')}</h3>
          <div
            data-testid="source-citation-excerpt"
            className="rounded-md border border-brand/20 bg-brand/10 p-4"
          >
            <Markdown renderImages={false}>{citation.chunk.content}</Markdown>
          </div>
        </section>
      </div>
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
