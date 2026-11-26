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
  readonly messageNudge: ChatConversationSlots['messageNudge'];
  readonly messageMarkdown: ChatConversationSlots['messageMarkdown'];
  readonly pendingSubmission: string | null;
  readonly contextHint?: ReactNode;
  readonly waiting?: ReactNode;
  readonly loading?: ReactNode;
  readonly assistantActions: ChatConversationSlots['assistantActions'];
  readonly onPiiUnmaskRequest?: PiiUnmaskRequestHandler;
  readonly onMessageCopied?: (role: 'user' | 'assistant') => void;
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
          copyActions={content.copyActions}
          Markdown={content.messageMarkdown ?? Markdown}
          onCopied={content.onMessageCopied}
        />
      )}
      renderRun={(unit, grouped) => (
        <ConversationAssistantRun
          unit={unit}
          grouped={grouped}
          threadId={content.threadId}
          copyActions={content.copyActions}
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
  copyActions,
  onOpenArtifact,
  timeline,
  assistantActions,
  onMessageCopied,
}: Readonly<{
  unit: AgentRunUnit;
  grouped: boolean;
  threadId: string;
  copyActions?: boolean;
  onOpenArtifact: ContentProps['onOpenArtifact'];
  timeline: ContentProps['timeline'];
  assistantActions: ContentProps['assistantActions'];
  onMessageCopied: ContentProps['onMessageCopied'];
}>) {
  const hasText = unit.blocks.some((block) => block.kind === 'text');
  const showCopy = Boolean(copyActions && hasText);
  const showActions = showCopy || Boolean(assistantActions && hasText);
  return (
    <AssistantMessageFrame
      grouped={grouped}
      actions={
        showActions
          ? (ref) => (
              <>
                {showCopy && (
                  <CopyAssistantMessage
                    contentRef={ref}
                    onCopied={() => onMessageCopied?.('assistant')}
                  />
                )}
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
  copyActions,
  Markdown: MessageMarkdown,
  onCopied,
}: Readonly<{
  message: Message;
  messageImage: ContentProps['messageImage'];
  messageNudge: ContentProps['messageNudge'];
  copyActions?: boolean;
  Markdown: NonNullable<TimelinePresentation['Markdown']>;
  onCopied: ContentProps['onMessageCopied'];
}>) {
  const masks = usePiiMasks();
  return (
    <UserMessage
      message={message}
      renderText={(text) => (
        <MessageMarkdown className={copyActions ? '[&_p]:!my-0' : undefined}>
          {text}
        </MessageMarkdown>
      )}
      renderNudge={(text) => messageNudge?.(text) ?? <PiiText>{text}</PiiText>}
      renderImage={(image) => messageImage?.(message, image)}
      actions={
        copyActions && (
          <CopyMessageButton
            getContent={() => ({
              text: resolvedPromptText(message, masks),
            })}
            onCopied={() => onCopied?.('user')}
          />
        )
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
