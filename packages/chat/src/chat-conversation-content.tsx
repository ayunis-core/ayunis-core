import type {
  GetThreadResponseDto,
  ToolCallDecisionDto,
} from '@ayunis/api-client/schemas';
import { memo, useMemo, useState, type RefObject } from 'react';
import {
  Markdown,
  PiiMaskProvider,
  SourceCitationProvider,
  usePiiMasks,
  type SourceCitation,
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
import type { ChatViewConfig } from './chat-config';
import type { ClientToolRegistration } from './client-tools';
import type { ToolCardRegistration } from './tool-cards';
import type { ToolCards } from './timeline/tool-card-types';
import { SourceCitationDialog } from './source-citation-dialog';
import { ContextHint } from './conversation-context-hint';
import { ConversationMessageImage } from './messages/ConversationMessageImage';
import { ResponseStartOrb } from './messages/ResponseStartOrb';
import { RoutineNudgeNotice } from './messages/RoutineNudgeNotice';
import { ReadAloudAction } from './read-aloud/ReadAloudAction';
import { usePiiUnmask } from './use-pii-unmask';

type Message = GetThreadResponseDto['messages'][number];

// One element for every render: the timeline presentation is memoized on it.
const RESPONSE_START_ORB = <ResponseStartOrb />;

interface ContentProps {
  readonly config: ChatViewConfig;
  readonly threadId: string;
  readonly messages: Message[];
  readonly masks: GetThreadResponseDto['piiMasks'];
  readonly isStreaming: boolean;
  readonly canDecide: boolean;
  readonly decide: (decisions: ToolCallDecisionDto[]) => Promise<void>;
  readonly timeline: TimelinePresentation;
  readonly pendingSubmission: string | null;
  /** The files a waiting message is held for, as a running activity. */
  readonly processing?: AgentRunUnit;
  /** False while files are processing: their activity shows instead of the orb. */
  readonly showOrb: boolean;
}

export function useConversationTimeline<Context, Outcome>(
  registeredCards: ToolCards | undefined,
  onCodeCopied: (() => void) | undefined,
  registry?: ReadonlyMap<string, ClientToolRegistration<Context, Outcome>>,
): TimelinePresentation {
  return useMemo(() => {
    const toolCards = new Map<string, ToolCardRegistration>(registeredCards);
    for (const [name, { render }] of registry ?? []) {
      if (render && !toolCards.has(name)) toolCards.set(name, { render });
    }
    return { toolCards, pendingIndicator: RESPONSE_START_ORB, onCodeCopied };
  }, [registeredCards, onCodeCopied, registry]);
}

export function ChatConversationContent(props: ContentProps) {
  const { timeline, isStreaming, canDecide, decide, threadId } = props;
  const units = useRenderUnits(props.messages, {
    isStreaming,
    hasPendingUserTurn: props.pendingSubmission !== null,
    toolCards: timeline.toolCards,
  });
  const showLoading =
    props.pendingSubmission !== null ||
    (isStreaming && units.at(-1)?.kind === 'user');
  const confirmation = useToolCallDecisions({
    messages: props.messages,
    isStreaming: !canDecide,
    sendDecisions: decide,
  });
  const pii = usePiiUnmask(threadId);
  const [citation, setCitation] = useState<SourceCitation | null>(null);
  return (
    <PiiMaskProvider masks={props.masks} onUnmaskRequest={pii.onUnmaskRequest}>
      <SourceCitationProvider onCitationClick={setCitation}>
        <ToolCallConfirmationContext.Provider value={confirmation}>
          <ConversationMessages
            content={props}
            units={units}
            showLoading={showLoading}
          />
        </ToolCallConfirmationContext.Provider>
      </SourceCitationProvider>
      {citation && (
        <SourceCitationDialog
          threadId={threadId}
          selectedCitation={citation}
          events={props.config.events}
          onClose={() => setCitation(null)}
        />
      )}
      {pii.dialog}
    </PiiMaskProvider>
  );
}

function ConversationMessages({
  content,
  units,
  showLoading,
}: Readonly<{
  content: ContentProps;
  units: ReturnType<typeof useRenderUnits>;
  showLoading: boolean;
}>) {
  const { config } = content;
  const waiting = content.pendingSubmission !== null && content.processing;
  return (
    <ChatMessageList<AgentRunUnit>
      units={units}
      pendingSubmission={content.pendingSubmission}
      contextHint={
        config.contextHint && <ContextHint hint={config.contextHint} />
      }
      renderUser={(message) => (
        <ConversationUserMessage
          message={message}
          onCopied={config.events.onMessageCopied}
        />
      )}
      renderRun={(unit, grouped) => (
        <ConversationAssistantRun
          unit={unit}
          grouped={grouped}
          threadId={content.threadId}
          onOpenArtifact={config.events.onOpenArtifact}
          timeline={content.timeline}
          onMessageCopied={config.events.onMessageCopied}
        />
      )}
      waiting={
        waiting && (
          <AgentRunTimeline unit={waiting} presentation={content.timeline} />
        )
      }
      loading={
        showLoading && !waiting && content.showOrb ? (
          <div className="mt-4">{RESPONSE_START_ORB}</div>
        ) : undefined
      }
    />
  );
}

const ConversationAssistantRun = memo(function ConversationAssistantRun({
  unit,
  grouped,
  threadId,
  onOpenArtifact,
  timeline,
  onMessageCopied,
}: Readonly<{
  unit: AgentRunUnit;
  grouped: boolean;
  threadId: string;
  onOpenArtifact: ChatViewConfig['events']['onOpenArtifact'];
  timeline: ContentProps['timeline'];
  onMessageCopied: ChatViewConfig['events']['onMessageCopied'];
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
                <ReadAloudAction unit={unit} contentRef={ref} />
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
  onCopied,
}: Readonly<{
  message: Message;
  onCopied: ChatViewConfig['events']['onMessageCopied'];
}>) {
  const masks = usePiiMasks();
  return (
    <UserMessage
      message={message}
      renderText={(text) => <Markdown className="[&_p]:!my-0">{text}</Markdown>}
      renderNudge={(text) => <RoutineNudgeNotice text={text} />}
      renderImage={(image) => (
        <ConversationMessageImage
          key={`${message.id}-${image.index}`}
          threadId={message.threadId}
          messageId={message.id}
          index={image.index}
          altText={image.altText}
        />
      )}
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
