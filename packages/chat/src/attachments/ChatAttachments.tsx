import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  Brain,
  DatabaseIcon,
  FileIcon,
  Loader2,
  Mic,
  Plug,
  Sparkles,
  XIcon,
} from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  FileSourceResponseDtoFileType,
  SourceProcessingErrorCode,
  SourceResponseDtoCreatedBy,
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@ayunis/api-client/schemas';
import { getSourceProcessingErrorKey } from '@ayunis/chat/source-errors';
import { ScrollFadeContainer } from './ScrollFadeContainer';

export interface ChatSourceAttachment {
  readonly id: string;
  readonly name: string;
  readonly type: SourceResponseDtoType;
  readonly fileType?: FileSourceResponseDtoFileType;
  readonly createdBy?: SourceResponseDtoCreatedBy;
  readonly status?: SourceResponseDtoStatus;
  readonly processingErrorCode?: SourceProcessingErrorCode;
  /** Set while the file is still being transferred to storage, from 0 to 1. */
  readonly uploadProgress?: number;
}

export interface ChatKnowledgeAttachment {
  readonly id: string;
  readonly name: string;
}

export interface ChatIntegrationAttachment {
  readonly id: string;
  readonly name: string;
  readonly logoUrl?: string | null;
}

interface ChatAttachmentsProps {
  readonly sources: readonly ChatSourceAttachment[];
  readonly knowledgeBases?: readonly ChatKnowledgeAttachment[];
  readonly integrations?: readonly ChatIntegrationAttachment[];
  readonly onRemoveSource: (sourceId: string) => void;
  readonly onRemoveKnowledgeBase?: (knowledgeBaseId: string) => void;
  readonly onRemoveIntegration?: (integrationId: string) => void;
}

export function ChatAttachments({
  sources,
  knowledgeBases = [],
  integrations = [],
  onRemoveSource,
  onRemoveKnowledgeBase,
  onRemoveIntegration,
}: Readonly<ChatAttachmentsProps>) {
  const visibleSources = sources.filter(
    (source) => source.createdBy !== 'system',
  );
  if (
    visibleSources.length === 0 &&
    knowledgeBases.length === 0 &&
    integrations.length === 0
  ) {
    return null;
  }

  return (
    <ScrollFadeContainer>
      <KnowledgeBadges items={knowledgeBases} remove={onRemoveKnowledgeBase} />
      <IntegrationBadges items={integrations} remove={onRemoveIntegration} />
      <SourceBadges items={visibleSources} remove={onRemoveSource} />
    </ScrollFadeContainer>
  );
}

function KnowledgeBadges({
  items,
  remove,
}: Readonly<{
  items: readonly ChatKnowledgeAttachment[];
  remove?: (id: string) => void;
}>) {
  return items.map((item) => (
    <ContextBadge
      key={`kb-${item.id}`}
      icon={<Brain className="h-3 w-3" />}
      label={item.name}
      remove={remove && (() => remove(item.id))}
    />
  ));
}

function IntegrationBadges({
  items,
  remove,
}: Readonly<{
  items: readonly ChatIntegrationAttachment[];
  remove?: (id: string) => void;
}>) {
  return items.map((item) => (
    <ContextBadge
      key={`integration-${item.id}`}
      icon={<IntegrationIcon integration={item} />}
      label={item.name}
      remove={remove && (() => remove(item.id))}
    />
  ));
}

function IntegrationIcon({
  integration,
}: Readonly<{ integration: ChatIntegrationAttachment }>) {
  if (!integration.logoUrl) return <Plug className="h-3 w-3" />;
  return (
    <img src={integration.logoUrl} alt="" className="h-3 w-3 rounded-sm" />
  );
}

function SourceBadges({
  items,
  remove,
}: Readonly<{
  items: readonly ChatSourceAttachment[];
  remove: (id: string) => void;
}>) {
  return items.map((item) => (
    <SourceBadge key={item.id} source={item} remove={() => remove(item.id)} />
  ));
}

function ContextBadge({
  icon,
  label,
  remove,
}: Readonly<{ icon: ReactNode; label: string; remove?: () => void }>) {
  const { t } = useTranslation('common');
  return (
    <Badge variant="secondary">
      {icon}
      {label}
      {remove && (
        <button
          type="button"
          aria-label={t('sources.removeFile', { name: label })}
          className="cursor-pointer"
          onClick={remove}
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

function SourceBadge({
  source,
  remove,
}: Readonly<{ source: ChatSourceAttachment; remove: () => void }>) {
  const state = sourceBadgeState(source);
  const badge = (
    <Badge
      data-testid="chat-source"
      data-source-id={source.id}
      data-source-status={state === 'uploading' ? state : source.status}
      tabIndex={state === 'failed' || state === 'reindexing' ? 0 : undefined}
      variant="secondary"
      className={cn(
        'flex items-center gap-1',
        source.createdBy === 'llm' && 'bg-[#8178C3]/10 text-[#8178C3]',
        state === 'failed' && 'bg-destructive/10 text-destructive',
      )}
    >
      <SourceStatusIcon source={source} state={state} />
      <span>{source.name}</span>
      <SourceBadgeAction source={source} state={state} remove={remove} />
    </Badge>
  );
  return <SourceBadgeTooltip source={source}>{badge}</SourceBadgeTooltip>;
}

type SourceBadgeState = 'uploading' | 'failed' | 'reindexing' | 'ready';

function sourceBadgeState(source: ChatSourceAttachment): SourceBadgeState {
  if (source.uploadProgress !== undefined) return 'uploading';
  if (source.status === 'failed') return 'failed';
  if (source.status === 'reindexing') return 'reindexing';
  return 'ready';
}

function SourceStatusIcon({
  source,
  state,
}: Readonly<{ source: ChatSourceAttachment; state: SourceBadgeState }>) {
  if (state === 'uploading' || state === 'reindexing') {
    return (
      <Loader2
        className="h-3 w-3 animate-spin"
        data-testid={
          state === 'uploading' ? 'chat-source-upload-spinner' : undefined
        }
      />
    );
  }
  if (state === 'failed') return <AlertCircle className="h-3 w-3" />;
  return <SourceIcon source={source} />;
}

function SourceBadgeAction({
  source,
  state,
  remove,
}: Readonly<{
  source: ChatSourceAttachment;
  state: SourceBadgeState;
  remove: () => void;
}>) {
  const { t } = useTranslation('common');
  if (state === 'uploading') {
    return (
      <span className="text-muted-foreground">
        {t('sources.uploading', {
          percent: Math.round((source.uploadProgress ?? 0) * 100),
        })}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-testid="chat-source-remove"
      aria-label={t('sources.removeFile', { name: source.name })}
      className="cursor-pointer"
      onClick={remove}
    >
      <XIcon className="h-3 w-3" />
    </button>
  );
}

function SourceBadgeTooltip({
  source,
  children,
}: Readonly<{ source: ChatSourceAttachment; children: ReactNode }>) {
  const { t } = useTranslation('common');
  if (source.status !== 'failed' && source.status !== 'reindexing') {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent align="start">
        {source.status === 'failed'
          ? t(getSourceProcessingErrorKey(source.processingErrorCode))
          : t('sources.reindexing')}
      </TooltipContent>
    </Tooltip>
  );
}

function SourceIcon({ source }: Readonly<{ source: ChatSourceAttachment }>) {
  if (source.createdBy === 'llm') return <Sparkles className="h-3 w-3" />;
  if (source.fileType === 'audio') return <Mic className="h-3 w-3" />;
  if (source.type === 'text') return <FileIcon className="h-3 w-3" />;
  if (source.type === 'data') return <DatabaseIcon className="h-3 w-3" />;
  return null;
}
