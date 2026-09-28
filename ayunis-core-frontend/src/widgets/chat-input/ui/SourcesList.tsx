import { useTranslation } from 'react-i18next';
import { getSourceProcessingErrorKey } from '@/widgets/chat-input/lib/source-processing-error';

// Types
import type {
  SourceResponseDto,
  FileSourceResponseDtoFileType,
  SourceResponseDtoType,
  SourceResponseDtoCreatedBy,
} from '@/shared/api';
import { SourceResponseDtoStatus } from '@/shared/api';

// Utils
import { cn } from '@ayunis/ui/lib/cn';

// UI
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { ScrollFadeContainer } from './ScrollFadeContainer';

// Icons
import {
  XIcon,
  FileIcon,
  DatabaseIcon,
  Sparkles,
  Brain,
  Loader2,
  AlertCircle,
  Mic,
  Plug,
} from 'lucide-react';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';

interface Source {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  fileType?: FileSourceResponseDtoFileType;
  createdBy?: SourceResponseDtoCreatedBy;
  status?: SourceResponseDtoStatus;
  processingError?: string;
  processingErrorCode?: SourceResponseDto['processingErrorCode'];
}

interface SourcesListProps {
  sources: Source[];
  knowledgeBases?: KnowledgeBaseSummary[];
  mcpIntegrations?: IntegrationSummary[];
  onRemove: (sourceId: string) => void;
  onRemoveKnowledgeBase?: (knowledgeBaseId: string) => void;
  onRemoveIntegration?: (integrationId: string) => void;
}

function getSourceIcon(source: {
  type: SourceResponseDtoType;
  fileType?: FileSourceResponseDtoFileType;
  createdByLLM?: boolean;
}) {
  if (source.createdByLLM) {
    return <Sparkles className="h-3 w-3" />;
  }
  if (source.fileType === 'audio') {
    return <Mic className="h-3 w-3" />;
  }
  switch (source.type) {
    case 'text':
      return <FileIcon className="h-3 w-3" />;
    case 'data':
      return <DatabaseIcon className="h-3 w-3" />;
    default:
      return null;
  }
}

export function SourcesList({
  sources,
  knowledgeBases = [],
  mcpIntegrations = [],
  onRemove,
  onRemoveKnowledgeBase,
  onRemoveIntegration,
}: Readonly<SourcesListProps>) {
  const { t } = useTranslation('common');
  const visibleSources = sources.filter(
    (source) => source.createdBy !== 'system',
  );

  if (
    visibleSources.length === 0 &&
    knowledgeBases.length === 0 &&
    mcpIntegrations.length === 0
  ) {
    return null;
  }

  return (
    <ScrollFadeContainer>
      {knowledgeBases.map((kb) => (
        <Badge key={`kb-${kb.id}`} variant="secondary">
          <Brain className="h-3 w-3" />
          {kb.name}
          {onRemoveKnowledgeBase && (
            <div
              className="cursor-pointer"
              onClick={() => onRemoveKnowledgeBase(kb.id)}
            >
              <XIcon className="h-3 w-3" />
            </div>
          )}
        </Badge>
      ))}
      {mcpIntegrations.map((integration) => (
        <Badge key={`integration-${integration.id}`} variant="secondary">
          {integration.logoUrl ? (
            <img
              src={integration.logoUrl}
              alt=""
              className="h-3 w-3 rounded-sm"
            />
          ) : (
            <Plug className="h-3 w-3" />
          )}
          {integration.name}
          {onRemoveIntegration && (
            <div
              className="cursor-pointer"
              onClick={() => onRemoveIntegration(integration.id)}
            >
              <XIcon className="h-3 w-3" />
            </div>
          )}
        </Badge>
      ))}
      {visibleSources.map((source) => {
        const isProcessing =
          source.status === SourceResponseDtoStatus.processing;
        const isFailed = source.status === SourceResponseDtoStatus.failed;

        const badge = (
          <Badge
            key={source.id}
            data-testid="chat-source"
            data-source-id={source.id}
            data-source-status={source.status}
            tabIndex={isFailed ? 0 : undefined}
            variant="secondary"
            className={cn(
              'flex items-center gap-1',
              source.createdBy === 'llm' && 'bg-[#8178C3]/10 text-[#8178C3]',
              isFailed && 'bg-destructive/10 text-destructive',
            )}
          >
            {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
            {isFailed && <AlertCircle className="h-3 w-3" />}
            {!isProcessing && !isFailed && getSourceIcon(source)}
            <span>{source.name}</span>
            {!isProcessing && (
              <button
                type="button"
                data-testid="chat-source-remove"
                aria-label={t('sources.removeFile', { name: source.name })}
                className="cursor-pointer"
                onClick={() => onRemove(source.id)}
              >
                <XIcon className="h-3 w-3" />
              </button>
            )}
          </Badge>
        );

        if (isFailed) {
          return (
            <Tooltip key={source.id}>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent align="start">
                {t(getSourceProcessingErrorKey(source.processingErrorCode))}
              </TooltipContent>
            </Tooltip>
          );
        }

        return badge;
      })}
    </ScrollFadeContainer>
  );
}
