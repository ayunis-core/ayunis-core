import { ChatAttachments } from '@ayunis/chat/attachments';
import { PaneAcademyNotice } from '@/outlook/ui/PaneAcademyNotice';
import {
  LongChatWarning,
  getModeValue,
  ModelSelector,
  ProviderFaultNotice,
} from '@ayunis/chat/model-presentation';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatConversation,
  type ChatConversationAdapters,
  type ChatConversationSlots,
  type ChatSurfaceConfig,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import type { ChatRunLifecycle } from '@ayunis/chat/runs';
import { AnonymousButton, type ChatDraftStorage } from '@ayunis/chat/composer';
import type {
  GetThreadResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import { PaneConversationHeading } from '@/outlook/ui/PaneConversationHeading';
import { PaneMessageImage } from '@/outlook/ui/PaneMessageImage';
import {
  useModelsControllerGetPermittedLanguageModels,
  threadSourcesControllerRemoveSource,
} from '@ayunis/api-client/endpoints';
import { OutlookToolBridgeContext } from '@/outlook/model/outlook-tool-bridge';
import {
  usePaneActiveRun,
  usePaneDocumentAttachments,
  usePaneThreadActions,
} from '@/outlook/lib/use-pane-chat-data';
import { useStandaloneOutlookTools } from '@/outlook/lib/use-standalone-outlook-tools';
import { transcribePaneAudio, uploadPaneFiles } from '@/outlook/api/chat-api';
import { showAttachmentError } from '@/outlook/lib/show-attachment-error';

interface PaneConversationProps {
  readonly userId: string;
  readonly thread: GetThreadResponseDto;
  readonly config: ChatSurfaceConfig;
  readonly lifecycle: ChatRunLifecycle;
  readonly drafts: ChatDraftStorage;
  readonly isAcademyGated: boolean;
  readonly onNewChat: () => void;
  readonly onDeleted: (threadId: string) => void;
  readonly onError: (error: unknown) => void;
}

type ThreadModel = PermittedLanguageModelResponseDto | undefined;

function useThreadModel(
  thread: GetThreadResponseDto,
  { capabilities }: ChatSurfaceConfig,
) {
  const models = useModelsControllerGetPermittedLanguageModels({
    query: {
      enabled: Boolean(capabilities.modelSelection),
    },
  });
  const model = models.data?.find(({ id, modelId }) =>
    thread.modelId
      ? modelId === thread.modelId
      : id === thread.permittedModelId,
  );
  return {
    models: models.data ?? [],
    model,
    unavailable: Boolean(thread.permittedModelId && models.isSuccess && !model),
  };
}

function useConversationAdapters({
  thread,
  config,
  drafts,
  model,
  isAcademyGated,
  onThreadState,
  onError,
}: Pick<
  PaneConversationProps,
  'thread' | 'config' | 'drafts' | 'isAcademyGated' | 'onError'
> & {
  readonly model: ThreadModel;
  readonly onThreadState: (thread: ChatThreadSnapshot) => void;
}): ChatConversationAdapters {
  const { refreshThread, refreshRun } = usePaneThreadActions();
  const documentAttachments = usePaneDocumentAttachments(config.capabilities);
  const upload = useCallback(
    async (id: string, files: File[], signal: AbortSignal) => {
      await uploadPaneFiles(id, files, signal);
      await refreshThread(id);
    },
    [refreshThread],
  );
  return {
    drafts,
    uploadFiles: upload,
    imageAttachments: model?.canVision,
    documentAttachments,
    onAttachmentError: showAttachmentError,
    transcribe: transcribePaneAudio,
    onThreadState,
    onRunSettled: refreshRun,
    onError,
    isSendDisabled:
      isAcademyGated ||
      thread.sources.some(({ status }) => status === 'processing'),
  };
}

function ConversationHeader({
  thread,
  title,
  config,
  lifecycle,
  onNewChat,
  onDeleted,
  onError,
}: Pick<
  PaneConversationProps,
  'thread' | 'config' | 'lifecycle' | 'onNewChat' | 'onDeleted' | 'onError'
> & { readonly title?: string }) {
  const actions = usePaneThreadActions();
  const rename = (value: string) => {
    void actions
      .rename(thread.id, value, lifecycle.getSessionSignal())
      .catch(onError);
  };
  const remove = () => {
    void actions
      .remove(thread.id, lifecycle.getSessionSignal())
      .then(() => onDeleted(thread.id))
      .catch(onError);
  };
  return (
    <PaneConversationHeading
      title={title}
      anonymous={thread.isAnonymous}
      onNewChat={onNewChat}
      rename={config.capabilities.rename ? rename : undefined}
      remove={config.capabilities.delete ? remove : undefined}
    />
  );
}

function ConversationNotices({
  thread,
  model,
  isAcademyGated,
  onNewChat,
}: Pick<PaneConversationProps, 'thread' | 'isAcademyGated' | 'onNewChat'> & {
  readonly model: ThreadModel;
}) {
  const { t } = useTranslation('chat');
  return (
    <>
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && (
        <LongChatWarning key={thread.id} onNewChat={onNewChat} />
      )}
      {isAcademyGated && <PaneAcademyNotice />}
      {model?.hasProviderFault && (
        <ProviderFaultNotice modelName={model.displayName} />
      )}
    </>
  );
}

function ThreadModelSelector({
  thread,
  models,
  model,
}: Readonly<{
  thread: GetThreadResponseDto;
  models: PermittedLanguageModelResponseDto[];
  model: ThreadModel;
}>) {
  return (
    <ModelSelector
      models={models}
      resolutions={[]}
      modelListPresentation="submenu"
      placeholder="Select a model"
      selectedModelId={
        thread.mode
          ? getModeValue(thread.mode)
          : (model?.id ?? thread.permittedModelId)
      }
      isAnonymous={thread.isAnonymous}
      isDisabled
      onModelChange={() => undefined}
    />
  );
}

function ThreadSources({
  thread,
  sources,
  onError,
}: Pick<PaneConversationProps, 'thread' | 'onError'> & {
  readonly sources: GetThreadResponseDto['sources'];
}) {
  const { refreshThread } = usePaneThreadActions();
  return (
    <ChatAttachments
      sources={sources}
      onRemoveSource={(id) => {
        void threadSourcesControllerRemoveSource(thread.id, id)
          .then(() => refreshThread(thread.id))
          .catch(onError);
      }}
    />
  );
}

function ConversationEmptyState() {
  const { t } = useTranslation('outlook');
  return (
    <p className="p-4 text-sm text-muted-foreground">
      {t('chat.empty', { defaultValue: 'Ask about this email' })}
    </p>
  );
}

function conversationSlots({
  props,
  title,
  models,
  model,
}: Readonly<{
  props: PaneConversationProps;
  title: string | undefined;
  models: PermittedLanguageModelResponseDto[];
  model: ThreadModel;
}>): ChatConversationSlots {
  const { thread, config } = props;
  const visibleSources = thread.sources.filter(
    ({ createdBy }) => createdBy !== 'system',
  );
  return {
    header: () => (
      <ConversationHeader key={thread.id} {...props} title={title} />
    ),
    composerNotice: <ConversationNotices {...props} model={model} />,
    composerModel: config.capabilities.modelSelection && (
      <ThreadModelSelector thread={thread} models={models} model={model} />
    ),
    composerLeading: <AnonymousButton isAnonymous={thread.isAnonymous} />,
    emptyState: <ConversationEmptyState />,
    attachments: visibleSources.length > 0 && (
      <ThreadSources {...props} sources={visibleSources} />
    ),
    messageImage: (message, { index, altText }) => (
      <PaneMessageImage
        key={message.id + '-' + index}
        threadId={thread.id}
        messageId={message.id}
        index={index}
        altText={altText}
      />
    ),
  };
}

export function PaneConversation(props: PaneConversationProps) {
  const { userId, thread, config, lifecycle, onNewChat } = props;
  const [renderedThread, setRenderedThread] = useState<ChatThreadSnapshot>();
  const { models, model, unavailable } = useThreadModel(thread, config);
  const activeRun = usePaneActiveRun(thread.id);
  const current = renderedThread?.id === thread.id ? renderedThread : thread;
  const { bridge, dispatch } = useStandaloneOutlookTools({
    threadId: thread.id,
    messages: current.messages,
    piiMasks: current.piiMasks,
  });
  const adapters = useConversationAdapters({
    ...props,
    model,
    onThreadState: setRenderedThread,
  });

  return (
    <OutlookToolBridgeContext.Provider value={bridge}>
      <ChatConversation
        compactComposer
        sessionKey={userId}
        thread={thread}
        config={config}
        lifecycle={lifecycle}
        activeRun={activeRun}
        clientTools={dispatch}
        composer={{
          unavailableModel: unavailable ? { onNewChat } : undefined,
        }}
        adapters={adapters}
        slots={conversationSlots({
          props,
          title: current.title,
          models,
          model,
        })}
      />
    </OutlookToolBridgeContext.Provider>
  );
}
