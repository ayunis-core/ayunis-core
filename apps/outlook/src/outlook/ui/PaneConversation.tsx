import { useState } from 'react';
import {
  Conversation,
  type ChatConfig,
  type ChatThreadState,
} from '@ayunis/chat/surface';
import type { ChatRunLifecycle } from '@ayunis/chat/runs';
import { OutlookToolBridgeContext } from '@/outlook/model/outlook-tool-bridge';
import { usePaneThreadActions } from '@/outlook/lib/use-pane-chat-data';
import { useStandaloneOutlookTools } from '@/outlook/lib/use-standalone-outlook-tools';

type PaneChatConfig = Omit<ChatConfig, 'clientTools' | 'events'> & {
  readonly events: Omit<ChatConfig['events'], 'onRunSettled' | 'onThreadState'>;
};

interface PaneConversationProps {
  readonly threadId: string;
  readonly config: PaneChatConfig;
  readonly lifecycle: ChatRunLifecycle;
}

const NO_STATE: Pick<ChatThreadState, 'messages' | 'piiMasks'> = {
  messages: [],
  piiMasks: [],
};

export function PaneConversation({
  threadId,
  config,
  lifecycle,
}: PaneConversationProps) {
  const [threadState, setThreadState] = useState<ChatThreadState>();
  const { refreshRun } = usePaneThreadActions();
  const current = threadState?.id === threadId ? threadState : NO_STATE;
  const { bridge, dispatch } = useStandaloneOutlookTools({
    threadId,
    messages: current.messages,
    piiMasks: current.piiMasks,
  });

  return (
    <OutlookToolBridgeContext.Provider value={bridge}>
      <Conversation
        threadId={threadId}
        config={{
          ...config,
          clientTools: dispatch,
          events: {
            ...config.events,
            onRunSettled: refreshRun,
            onThreadState: setThreadState,
          },
        }}
        lifecycle={lifecycle}
      />
    </OutlookToolBridgeContext.Provider>
  );
}
