import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  DatabaseIcon,
  FileIcon,
  Loader2,
  Mic,
  XIcon,
} from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type {
  FileSourceResponseDto,
  SourceResponseDto,
} from '@ayunis/api-client/schemas';
import { getSourceProcessingErrorKey } from '@ayunis/chat/source-errors';
import { ScrollFadeContainer } from './ScrollFadeContainer';

type SourceChip = Pick<SourceResponseDto, 'id' | 'name' | 'type'> &
  Partial<
    Pick<SourceResponseDto, 'createdBy' | 'status' | 'processingErrorCode'>
  > & { fileType?: FileSourceResponseDto['fileType'] };

export function PaneSourceChips({
  sources,
  remove,
}: Readonly<{
  sources: readonly SourceChip[];
  remove: (id: string) => void;
}>) {
  return (
    <ScrollFadeContainer>
      {sources.map((source) => (
        <PaneSourceChip
          source={source}
          key={source.id}
          remove={() => remove(source.id)}
        />
      ))}
    </ScrollFadeContainer>
  );
}

function PaneSourceChip({
  source,
  remove,
}: Readonly<{ source: SourceChip; remove: () => void }>) {
  const { t } = useTranslation('common');
  const failed = source.status === 'failed';
  const reindexing = source.status === 'reindexing';
  const badge = (
    <Badge
      data-testid="chat-source"
      data-source-id={source.id}
      data-source-status={source.status}
      tabIndex={failed || reindexing ? 0 : undefined}
      variant="secondary"
      className={cn(
        'flex items-center gap-1',
        source.createdBy === 'llm' && 'bg-[#8178C3]/10 text-[#8178C3]',
        failed && 'bg-destructive/10 text-destructive',
      )}
    >
      <SourceIcon source={source} />
      <span>{source.name}</span>
      <button
        type="button"
        data-testid="chat-source-remove"
        aria-label={t('sources.removeFile', { name: source.name })}
        className="cursor-pointer"
        onClick={remove}
      >
        <XIcon className="h-3 w-3" />
      </button>
    </Badge>
  );
  if (!failed && !reindexing) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent align="start">
        {failed
          ? t(getSourceProcessingErrorKey(source.processingErrorCode))
          : t('sources.reindexing')}
      </TooltipContent>
    </Tooltip>
  );
}

function SourceIcon({ source }: Readonly<{ source: SourceChip }>) {
  if (source.status === 'reindexing')
    return <Loader2 className="h-3 w-3 animate-spin" />;
  if (source.status === 'failed') return <AlertCircle className="h-3 w-3" />;
  if (source.fileType === 'audio') return <Mic className="h-3 w-3" />;
  if (source.type === 'text') return <FileIcon className="h-3 w-3" />;
  return <DatabaseIcon className="h-3 w-3" />;
}
