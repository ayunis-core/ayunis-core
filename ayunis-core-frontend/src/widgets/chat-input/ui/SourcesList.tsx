// Types
import type {
  FileSourceResponseDtoFileType,
  SourceResponseDtoType,
  SourceResponseDtoCreatedBy,
} from '@/shared/api';
import { SourceResponseDtoStatus } from '@/shared/api';

// Utils
import { cn } from '@/shared/lib/shadcn/utils';
import { useTranslation } from 'react-i18next';

// UI
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
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

export interface SourceProcessingProgress {
  stage: 'extracting' | 'indexing' | 'parsing';
  processedPages?: number;
  totalPages?: number;
}

interface Source {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  fileType?: FileSourceResponseDtoFileType;
  createdBy?: SourceResponseDtoCreatedBy;
  status?: SourceResponseDtoStatus;
  processingError?: string;
  processingProgress?: SourceProcessingProgress;
  /** Transfer progress while the file is still uploading (new-chat flow). */
  uploadPercent?: number;
}

interface SourcesListProps {
  sources: Source[];
  knowledgeBases?: KnowledgeBaseSummary[];
  mcpIntegrations?: IntegrationSummary[];
  onRemove: (sourceId: string) => void;
  onRemoveKnowledgeBase?: (knowledgeBaseId: string) => void;
  onRemoveIntegration?: (integrationId: string) => void;
  onDownload?: (sourceId: string) => void;
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
  onDownload,
}: Readonly<SourcesListProps>) {
  const { t } = useTranslation('common');
  const visibleSources = sources.filter(
    (source) => source.createdBy !== 'system',
  );

  function progressLabel(
    progress?: SourceProcessingProgress,
    uploadPercent?: number,
  ): string {
    if (uploadPercent !== undefined) {
      return t('sources.progressUploading', { percent: uploadPercent });
    }
    if (progress?.stage === 'extracting' && progress.totalPages) {
      return t('sources.progressExtracting', {
        current: progress.processedPages ?? 0,
        total: progress.totalPages,
      });
    }
    if (progress?.stage === 'indexing') {
      return t('sources.progressIndexing');
    }
    return t('sources.progressProcessing');
  }

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
            variant="secondary"
            className={cn(
              'flex items-center gap-1 cursor-pointer',
              source.createdBy === 'llm' && 'bg-[#8178C3]/10 text-[#8178C3]',
              isFailed && 'bg-destructive/10 text-destructive',
            )}
            onClick={() =>
              source.type === 'data' &&
              source.status === SourceResponseDtoStatus.ready &&
              onDownload?.(source.id)
            }
          >
            {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
            {isFailed && <AlertCircle className="h-3 w-3" />}
            {!isProcessing && !isFailed && getSourceIcon(source)}
            {source.name}
            {isProcessing && (
              <span className="text-muted-foreground">
                {progressLabel(source.processingProgress, source.uploadPercent)}
              </span>
            )}
            {!isProcessing && (
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(source.id);
                }}
              >
                <XIcon className="h-3 w-3" />
              </div>
            )}
          </Badge>
        );

        if (isFailed && source.processingError) {
          return (
            <Tooltip key={source.id}>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent>{source.processingError}</TooltipContent>
            </Tooltip>
          );
        }

        return badge;
      })}
    </ScrollFadeContainer>
  );
}
