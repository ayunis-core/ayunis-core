import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatConversation,
  type ChatConfig,
  type ChatConversationSlots,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import type { ChatRunLifecycle } from '@ayunis/chat/runs';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { PaneConversationHeading } from '@/outlook/ui/PaneConversationHeading';
import { PaneMessageImage } from '@/outlook/ui/PaneMessageImage';
import { OutlookToolBridgeContext } from '@/outlook/model/outlook-tool-bridge';
import {
  usePaneActiveRun,
  usePaneThreadActions,
} from '@/outlook/lib/use-pane-chat-data';
import { useStandaloneOutlookTools } from '@/outlook/lib/use-standalone-outlook-tools';

type PaneChatConfig = Omit<ChatConfig, 'clientTools' | 'events'> & {
  readonly events: Omit<ChatConfig['events'], 'onRunSettled'>;
};

interface PaneConversationProps {
  readonly thread: GetThreadResponseDto;
  readonly config: PaneChatConfig;
  readonly lifecycle: ChatRunLifecycle;
  readonly onNewChat: () => void;
  readonly onDeleted: (threadId: string) => void;
  readonly onError: (error: unknown) => void;
}

function ConversationHeader({
  thread,
  title,
  lifecycle,
  onNewChat,
  onDeleted,
  onError,
}: Pick<
  PaneConversationProps,
  'thread' | 'lifecycle' | 'onNewChat' | 'onDeleted' | 'onError'
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
      rename={rename}
      remove={remove}
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

function conversationSlots(
  props: PaneConversationProps,
  title: string | undefined,
): ChatConversationSlots {
  const { thread } = props;
  return {
    header: () => (
      <ConversationHeader key={thread.id} {...props} title={title} />
    ),
    emptyState: <ConversationEmptyState />,
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
  const { thread, config, lifecycle } = props;
  const [renderedThread, setRenderedThread] = useState<ChatThreadSnapshot>();
  const activeRun = usePaneActiveRun(thread.id);
  const { refreshRun } = usePaneThreadActions();
  const current = renderedThread?.id === thread.id ? renderedThread : thread;
  const { bridge, dispatch } = useStandaloneOutlookTools({
    threadId: thread.id,
    messages: current.messages,
    piiMasks: current.piiMasks,
  });

  return (
    <OutlookToolBridgeContext.Provider value={bridge}>
      <ChatConversation
        thread={thread}
        config={{
          ...config,
          clientTools: dispatch,
          events: { ...config.events, onRunSettled: refreshRun },
        }}
        lifecycle={lifecycle}
        activeRun={activeRun}
        adapters={{ onThreadState: setRenderedThread }}
        slots={conversationSlots(props, current.title)}
      />
    </OutlookToolBridgeContext.Provider>
  );
}
