import { Button } from '@ayunis/ui/components/button';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatConversation,
  type ChatSurfaceConfig,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import type { ChatRunLifecycle } from '@ayunis/chat/runs';
import type { ChatDraftStorage } from '@ayunis/chat/composer';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { PaneMessageImage } from '@/outlook/ui/PaneMessageImage';
import {
  useModelsControllerGetPermittedLanguageModels,
  threadSourcesControllerRemoveSource,
} from '@ayunis/api-client/endpoints';
import { OutlookToolBridgeContext } from '@/outlook/model/outlook-tool-bridge';
import {
  usePaneActiveRun,
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
  readonly onError: (error: unknown) => void;
}

export function PaneConversation({
  userId,
  thread,
  config,
  lifecycle,
  drafts,
  onError,
}: PaneConversationProps) {
  const [renderedThread, setRenderedThread] = useState<ChatThreadSnapshot>();
  const models = useModelsControllerGetPermittedLanguageModels({
    query: {
      enabled: Boolean(
        config.capabilities.modelSelection && config.capabilities.fileUpload,
      ),
    },
  });
  const model = models.data?.find(
    ({ id, modelId }) =>
      id === thread.permittedModelId || modelId === thread.modelId,
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
          transcribe: transcribePaneAudio,
          onThreadState: setRenderedThread,
          onRunSettled: actions.refreshRun,
          onError,
          isSendDisabled: thread.sources.some(
            ({ status }) => status === 'processing',
          ),
        }}
        slots={{
          emptyState: (
            <p className="p-4 text-sm text-muted-foreground">
              {t('chat.empty', { defaultValue: 'Ask about this email' })}
            </p>
          ),
          attachments: (
            <ThreadFiles
              sources={thread.sources}
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

function ThreadFiles({
  sources,
  remove,
}: Readonly<{
  sources: GetThreadResponseDto['sources'];
  remove: (id: string) => void;
}>) {
  const { t } = useTranslation('common');
  if (sources.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {sources.map(({ id, name, status }) => (
        <li
          key={id}
          className="rounded-md bg-muted px-2 py-1"
          data-source-status={status}
        >
          {name}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="ml-2"
            aria-label={t('chatSurface.removeFile', {
              defaultValue: 'Remove {{name}}',
              name,
            })}
            onClick={() => remove(id)}
          >
            ×
          </Button>
        </li>
      ))}
    </ul>
  );
}
