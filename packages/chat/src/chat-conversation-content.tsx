import type {
  GetThreadResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client/schemas';
import { memo, useMemo, type ReactNode, type RefObject } from 'react';
import {
  Markdown,
  PiiMaskProvider,
  PiiText,
  usePiiMasks,
  type PiiUnmaskRequestHandler,
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
import type { ToolCards } from './timeline/tool-card-types';
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
  readonly messageNudge: ChatConversationSlots['messageNudge'];
  readonly pendingSubmission: string | null;
  readonly contextHint?: ReactNode;
  readonly waiting?: ReactNode;
  readonly loading?: ReactNode;
  readonly assistantActions: ChatConversationSlots['assistantActions'];
  readonly onPiiUnmaskRequest?: PiiUnmaskRequestHandler;
  readonly onMessageCopied?: (role: 'user' | 'assistant') => void;
}

export function useConversationTimeline<Context, Outcome>(
  registeredCards: ToolCards | undefined,
  pendingIndicator: ReactNode,
  onCodeCopied: (() => void) | undefined,
  registry?: ReadonlyMap<string, ClientToolRegistration<Context, Outcome>>,
): TimelinePresentation {
  return useMemo(() => {
    const toolCards = new Map<string, ToolCardRegistration>(registeredCards);
    for (const [name, { render }] of registry ?? []) {
      if (render && !toolCards.has(name)) toolCards.set(name, { render });
    }
    return { toolCards, pendingIndicator, onCodeCopied };
  }, [registeredCards, pendingIndicator, onCodeCopied, registry]);
}

export function ChatConversationContent(props: ContentProps) {
  const { timeline, isStreaming, canDecide, decide } = props;
  const units = useRenderUnits(props.messages, {
    isStreaming: props.isStreaming,
    hasPendingUserTurn: props.pendingSubmission !== null,
    toolCards: timeline?.toolCards,
  });
  const showLoading =
    props.pendingSubmission !== null ||
    (isStreaming && units.at(-1)?.kind === 'user');
  const showWaiting = props.pendingSubmission !== null && props.waiting;
  const confirmation = useToolCallDecisions({
    messages: props.messages,
    isStreaming: !canDecide,
    sendDecisions: decide,
  });
  return (
    <PiiMaskProvider
      masks={props.masks}
      onUnmaskRequest={props.onPiiUnmaskRequest}
    >
      <ToolCallConfirmationContext.Provider value={confirmation}>
        <ConversationMessages
          content={props}
          units={units}
          showWaiting={showWaiting}
          showLoading={showLoading}
        />
      </ToolCallConfirmationContext.Provider>
    </PiiMaskProvider>
  );
}

function ConversationMessages({
  content,
  units,
  showWaiting,
  showLoading,
}: Readonly<{
  content: ContentProps;
  units: ReturnType<typeof useRenderUnits>;
  showWaiting: ReactNode;
  showLoading: boolean;
}>) {
  return (
    <ChatMessageList<AgentRunUnit>
      units={units}
      pendingSubmission={content.pendingSubmission}
      contextHint={content.contextHint}
      renderUser={(message) => (
        <ConversationUserMessage
          message={message}
          messageImage={content.messageImage}
          messageNudge={content.messageNudge}
          onCopied={content.onMessageCopied}
        />
      )}
      renderRun={(unit, grouped) => (
        <ConversationAssistantRun
          unit={unit}
          grouped={grouped}
          threadId={content.threadId}
          onOpenArtifact={content.onOpenArtifact}
          timeline={content.timeline}
          assistantActions={content.assistantActions}
          onMessageCopied={content.onMessageCopied}
        />
      )}
      waiting={showWaiting}
      loading={showLoading && !showWaiting ? content.loading : undefined}
    />
  );
}

const ConversationAssistantRun = memo(function ConversationAssistantRun({
  unit,
  grouped,
  threadId,
  onOpenArtifact,
  timeline,
  assistantActions,
  onMessageCopied,
}: Readonly<{
  unit: AgentRunUnit;
  grouped: boolean;
  threadId: string;
  onOpenArtifact: ContentProps['onOpenArtifact'];
  timeline: ContentProps['timeline'];
  assistantActions: ContentProps['assistantActions'];
  onMessageCopied: ContentProps['onMessageCopied'];
}>) {
  const hasText = unit.blocks.some((block) => block.kind === 'text');
  return (
    <AssistantMessageFrame
      grouped={grouped}
      actions={
        hasText
          ? (ref) => (
              <>
                <CopyAssistantMessage
                  contentRef={ref}
                  onCopied={() => onMessageCopied?.('assistant')}
                />
                {assistantActions?.(unit, ref)}
              </>
            )
          : undefined
      }
    >
      <AgentRunTimeline
        unit={unit}
        threadId={threadId}
        onOpenArtifact={onOpenArtifact}
        presentation={timeline}
      />
    </AssistantMessageFrame>
  );
});

const ConversationUserMessage = memo(function ConversationUserMessage({
  message,
  messageImage,
  messageNudge,
  onCopied,
}: Readonly<{
  message: Message;
  messageImage: ContentProps['messageImage'];
  messageNudge: ContentProps['messageNudge'];
  onCopied: ContentProps['onMessageCopied'];
}>) {
  const masks = usePiiMasks();
  return (
    <UserMessage
      message={message}
      renderText={(text) => <Markdown className="[&_p]:!my-0">{text}</Markdown>}
      renderNudge={(text) => messageNudge?.(text) ?? <PiiText>{text}</PiiText>}
      renderImage={(image) => messageImage?.(message, image)}
      actions={
        <CopyMessageButton
          getContent={() => ({
            text: resolvedPromptText(message, masks),
          })}
          onCopied={() => onCopied?.('user')}
        />
      }
    />
  );
});

function CopyAssistantMessage({
  contentRef,
  onCopied,
}: Readonly<{
  contentRef: RefObject<HTMLDivElement | null>;
  onCopied?: () => void;
}>) {
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

  return <CopyMessageButton getContent={getContent} onCopied={onCopied} />;
}
