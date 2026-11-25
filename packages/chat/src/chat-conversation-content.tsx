import type {
  GetThreadResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client/schemas';
import { useMemo } from 'react';
import { Markdown, PiiMaskProvider, PiiText } from '@ayunis/chat/markdown';
import {
  AssistantMessageFrame,
  ChatMessageList,
  UserMessage,
} from '@ayunis/chat/messages';
import {
  AgentRunTimeline,
  ToolCallConfirmationContext,
  useRenderUnits,
  useToolCallDecisions,
  type AgentRunUnit,
  type TimelinePresentation,
} from '@ayunis/chat/timeline';
import type { ClientToolRegistration } from './client-tools';
import type { ToolCardRegistration } from './tool-cards';
import type { ChatConversationSlots } from './chat-conversation-config';
import type { ChatSlots } from './chat-surface-config';

type Message = GetThreadResponseDto['messages'][number];

interface ContentProps {
  readonly threadId: string;
  readonly messages: Message[];
  readonly masks: GetThreadResponseDto['piiMasks'];
  readonly isStreaming: boolean;
  readonly canDecide: boolean;
  readonly decide: (decisions: ToolCallDecisionDto[]) => Promise<void>;
  readonly onOpenArtifact: ChatSlots['onOpenArtifact'];
  readonly timeline?: TimelinePresentation;
  readonly messageImage: ChatConversationSlots['messageImage'];
}

export function useConversationTimeline<Context, Outcome>(
  timeline?: TimelinePresentation,
  registry?: ReadonlyMap<string, ClientToolRegistration<Context, Outcome>>,
): TimelinePresentation {
  return useMemo(() => {
    const toolCards = new Map<string, ToolCardRegistration>(
      timeline?.toolCards,
    );
    for (const [name, { render }] of registry ?? []) {
      if (render && !toolCards.has(name)) toolCards.set(name, { render });
    }
    return { ...timeline, toolCards };
  }, [timeline, registry]);
}

export function ChatConversationContent(props: ContentProps) {
  const {
    threadId,
    messages,
    masks,
    timeline,
    isStreaming,
    canDecide,
    decide,
    onOpenArtifact,
    messageImage,
  } = props;
  const units = useRenderUnits(messages, {
    isStreaming,
    toolCards: timeline?.toolCards,
  });
  const confirmation = useToolCallDecisions({
    messages,
    isStreaming: !canDecide,
    sendDecisions: decide,
  });
  return (
    <PiiMaskProvider masks={masks}>
      <ToolCallConfirmationContext.Provider value={confirmation}>
        <ChatMessageList<AgentRunUnit>
          units={units}
          pendingSubmission={null}
          contextHint={null}
          renderUser={(message) => renderUser(message, messageImage)}
          renderRun={(unit, grouped) => (
            <AssistantMessageFrame grouped={grouped}>
              <AgentRunTimeline
                {...{ unit, threadId, onOpenArtifact }}
                presentation={timeline}
              />
            </AssistantMessageFrame>
          )}
        />
      </ToolCallConfirmationContext.Provider>
    </PiiMaskProvider>
  );
}

function renderUser(
  message: Message,
  messageImage: ContentProps['messageImage'],
) {
  return (
    <UserMessage
      message={message}
      renderText={(text) => <Markdown>{text}</Markdown>}
      renderNudge={(text) => <PiiText>{text}</PiiText>}
      renderImage={(image) => messageImage?.(message, image)}
    />
  );
}
