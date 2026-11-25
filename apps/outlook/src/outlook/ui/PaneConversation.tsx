import { toast } from '@ayunis/ui/lib/toast';
import { PaneSourceChips } from '@/outlook/ui/PaneSourceChips';
import { PaneAcademyNotice } from '@/outlook/ui/PaneAcademyNotice';
import {
  LongChatWarning,
  getModeValue,
  ModelSelector,
  ProviderFaultNotice,
  UnavailableModelNotice,
} from '@ayunis/chat/model-presentation';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatConversation,
  type ChatSurfaceConfig,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import type { ChatRunLifecycle } from '@ayunis/chat/runs';
import { AnonymousButton, type ChatDraftStorage } from '@ayunis/chat/composer';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
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

export function PaneConversation({
  userId,
  thread,
  config,
  lifecycle,
  drafts,
  isAcademyGated,
  onNewChat,
  onDeleted,
  onError,
}: PaneConversationProps) {
  const [renderedThread, setRenderedThread] = useState<ChatThreadSnapshot>();
  const models = useModelsControllerGetPermittedLanguageModels({
    query: {
      enabled: Boolean(config.capabilities.modelSelection),
    },
  });
  const documentAttachments = usePaneDocumentAttachments(config.capabilities);
  const model = models.data?.find(({ id, modelId }) =>
    thread.modelId
      ? modelId === thread.modelId
      : id === thread.permittedModelId,
  );
  const modelUnavailable = Boolean(
    thread.permittedModelId && models.isSuccess && !model,
  );
  const activeRun = usePaneActiveRun(thread.id);
  const actions = usePaneThreadActions();
  const current = renderedThread?.id === thread.id ? renderedThread : thread;
  const { bridge, dispatch } = useStandaloneOutlookTools({
    threadId: thread.id,
    messages: current.messages,
    piiMasks: current.piiMasks,
  });
  const { t } = useTranslation('outlook');
  const { t: chat } = useTranslation('chat');
  const visibleSources = thread.sources.filter(
    ({ createdBy }) => createdBy !== 'system',
  );

  const upload = useCallback(
    async (id: string, files: File[], signal: AbortSignal) => {
      await uploadPaneFiles(id, files, signal);
      await actions.refreshThread(id);
    },
    [actions.refreshThread],
  );

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
        adapters={{
          drafts,
          uploadFiles: upload,
          imageAttachments: model?.canVision,
          documentAttachments,
          onAttachmentError: (error) => {
            toast.error(error.message, {
              position: 'bottom-center',
              closeButton: true,
            });
          },
          transcribe: transcribePaneAudio,
          onThreadState: setRenderedThread,
          onRunSettled: actions.refreshRun,
          onError,
          isSendDisabled:
            isAcademyGated ||
            thread.sources.some(({ status }) => status === 'processing'),
        }}
        slots={{
          header: () => (
            <PaneConversationHeading
              key={thread.id}
              title={current.title}
              anonymous={thread.isAnonymous}
              onNewChat={onNewChat}
              rename={
                config.capabilities.rename
                  ? (title) => {
                      void actions
                        .rename(thread.id, title, lifecycle.getSessionSignal())
                        .catch(onError);
                    }
                  : undefined
              }
              remove={
                config.capabilities.delete
                  ? () => {
                      void actions
                        .remove(thread.id, lifecycle.getSessionSignal())
                        .then(() => onDeleted(thread.id))
                        .catch(onError);
                    }
                  : undefined
              }
            />
          ),
          composerFallback: modelUnavailable && (
            <UnavailableModelNotice onNewChat={onNewChat} />
          ),
          composerNotice: (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                {chat('chat.inputDisclaimer')}
              </p>
              {thread.isLongChat && (
                <LongChatWarning key={thread.id} onNewChat={onNewChat} />
              )}
              {isAcademyGated && <PaneAcademyNotice />}
              {model?.hasProviderFault && (
                <ProviderFaultNotice modelName={model.displayName} />
              )}
            </>
          ),
          composerModel: config.capabilities.modelSelection && (
            <ModelSelector
              models={models.data ?? []}
              resolutions={[]}
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
          ),
          composerLeading: <AnonymousButton isAnonymous={thread.isAnonymous} />,
          emptyState: (
            <p className="p-4 text-sm text-muted-foreground">
              {t('chat.empty', { defaultValue: 'Ask about this email' })}
            </p>
          ),
          attachments: visibleSources.length > 0 && (
            <PaneSourceChips
              sources={visibleSources}
              remove={(id) => {
                void threadSourcesControllerRemoveSource(thread.id, id)
                  .then(() => actions.refreshThread(thread.id))
                  .catch(onError);
              }}
            />
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
        }}
      />
    </OutlookToolBridgeContext.Provider>
  );
}
