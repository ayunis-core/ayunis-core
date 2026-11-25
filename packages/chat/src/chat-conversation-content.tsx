import type {
  GetThreadResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client/schemas';
import { useMemo, type RefObject } from 'react';
import {
  Markdown,
  PiiMaskProvider,
  PiiText,
  usePiiMasks,
} from '@ayunis/chat/markdown';
import {
  AssistantMessageFrame,
  ChatMessageList,
  CopyMessageButton,
  copyableMessageContent,
  resolvedPromptText,
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
  readonly copyActions?: boolean;
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
  const { messages, timeline, isStreaming, canDecide, decide } = props;
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
    <PiiMaskProvider masks={props.masks}>
      <ToolCallConfirmationContext.Provider value={confirmation}>
        <ChatMessageList<AgentRunUnit>
          units={units}
          pendingSubmission={null}
          contextHint={null}
          renderUser={(message) => (
            <ConversationUserMessage
              message={message}
              messageImage={props.messageImage}
              copyActions={props.copyActions}
            />
          )}
          renderRun={(unit, grouped) => (
            <ConversationAssistantRun
              unit={unit}
              grouped={grouped}
              content={props}
            />
          )}
        />
      </ToolCallConfirmationContext.Provider>
    </PiiMaskProvider>
  );
}

function ConversationAssistantRun({
  unit,
  grouped,
  content,
}: Readonly<{ unit: AgentRunUnit; grouped: boolean; content: ContentProps }>) {
  const showCopy =
    content.copyActions && unit.blocks.some((block) => block.kind === 'text');
  return (
    <AssistantMessageFrame
      grouped={grouped}
      actions={
        showCopy
          ? (ref) => <CopyAssistantMessage contentRef={ref} />
          : undefined
      }
    >
      <AgentRunTimeline
        unit={unit}
        threadId={content.threadId}
        onOpenArtifact={content.onOpenArtifact}
        presentation={content.timeline}
      />
    </AssistantMessageFrame>
  );
}

function ConversationUserMessage({
  message,
  messageImage,
  copyActions,
}: Readonly<{
  message: Message;
  messageImage: ContentProps['messageImage'];
  copyActions?: boolean;
}>) {
  const masks = usePiiMasks();
  return (
    <UserMessage
      message={message}
      renderText={(text) => (
        <Markdown className={copyActions ? '[&_p]:!my-0' : undefined}>
          {text}
        </Markdown>
      )}
      renderNudge={(text) => <PiiText>{text}</PiiText>}
      renderImage={(image) => messageImage?.(message, image)}
      actions={
        copyActions && (
          <CopyMessageButton
            getContent={() => ({
              text: resolvedPromptText(message, masks),
            })}
          />
        )
      }
    />
  );
}

function CopyAssistantMessage({
  contentRef,
}: Readonly<{ contentRef: RefObject<HTMLDivElement | null> }>) {
  function getContent() {
    const nodes = contentRef.current?.querySelectorAll(
      '[data-copyable="true"]',
    );
    if (!nodes?.length) return null;
    const parts = Array.from(nodes, copyableMessageContent);
    return {
      html: parts.map(({ html }) => html).join('<br><br>'),
      text: parts.map(({ text }) => text).join('\n\n'),
    };
  }

  return <CopyMessageButton getContent={getContent} />;
}
