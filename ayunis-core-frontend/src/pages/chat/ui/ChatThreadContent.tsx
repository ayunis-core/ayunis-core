import { Fragment, type ReactNode } from 'react';
import ChatMessage from '@/pages/chat/ui/ChatMessage';
import AssistantRunBlock from '@/pages/chat/ui/AssistantRunBlock';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import {
  AgentRunTimeline,
  type RenderUnit,
} from '@/pages/chat/ui/agent-run-timeline';
import type { Message } from '@/pages/chat/model/openapi';
import type { SourceAttachment } from '@/pages/chat/model/source-attachment';
import {
  sourceAttachments,
  withAttachmentProcessing,
  pendingProcessingRun,
  type SourceAttachmentsInput,
} from '@/pages/chat/lib/source-attachments';
import { ChatAttachments } from '@/pages/chat/ui/ChatAttachments';

interface ChatThreadContentProps {
  readonly renderUnits: readonly RenderUnit[];
  readonly threadId: string;
  readonly pendingSubmission: string | null;
  readonly attachmentData?: SourceAttachmentsInput;
  readonly onRemoveSource?: (id: string) => void;
  readonly onRemoveUpload?: (id: string) => void;
  readonly contextHint: ReactNode;
  readonly showLoadingPlaceholder: boolean;
  readonly onOpenArtifact: (artifactId: string) => void;
}

export function ChatThreadContent(props: ChatThreadContentProps) {
  const {
    renderUnits,
    threadId,
    pendingSubmission,
    contextHint,
    showLoadingPlaceholder,
    onOpenArtifact,
  } = props;
  const attachments = props.attachmentData
    ? sourceAttachments(props.attachmentData)
    : [];
  const units = withAttachmentProcessing(renderUnits, attachments);
  const pendingAttachments = attachments.filter((item) => !item.messageId);
  const firstUserUnitIndex = units.findIndex((unit) => unit.kind === 'user');
  const last = units.at(-1);
  const standalone =
    pendingSubmission !== null || pendingAttachments.length > 0
      ? pendingAttachments
      : attachments.filter(
          (item) => last?.kind === 'user' && item.messageId === last.message.id,
        );
  const remove = (attachment: SourceAttachment) =>
    attachment.origin === 'source'
      ? props.onRemoveSource?.(attachment.id)
      : props.onRemoveUpload?.(attachment.id);
  const previews = (items: SourceAttachment[]) =>
    items.length > 0 ? (
      <ChatAttachments attachments={items} onRemove={remove} />
    ) : undefined;

  return (
    <div className="p-4 pb-8">
      {units.map((unit, index) => {
        if (unit.kind === 'user')
          return (
            <Fragment key={unit.key}>
              {index === firstUserUnitIndex && contextHint}
              <ChatMessage
                message={unit.message}
                attachments={previews(
                  attachments.filter(
                    (item) => item.messageId === unit.message.id,
                  ),
                )}
              />
            </Fragment>
          );
        return (
          <AssistantRunBlock
            key={unit.key}
            unit={unit}
            isGroupedWithPrevious={units[index - 1]?.kind === 'agent-run'}
            threadId={threadId}
            onOpenArtifact={onOpenArtifact}
          />
        );
      })}
      {(pendingSubmission !== null || pendingAttachments.length > 0) && (
        <>
          {firstUserUnitIndex === -1 && contextHint}
          <div data-testid="pending-user-message">
            <ChatMessage
              message={makePendingUserMessage(pendingSubmission ?? '')}
              attachments={previews(pendingAttachments)}
            />
          </div>
        </>
      )}
      {standalone.length > 0 && (
        <div className="mt-4 max-w-2xl">
          <AgentRunTimeline
            unit={pendingProcessingRun(standalone, showLoadingPlaceholder)}
          />
        </div>
      )}
      {showLoadingPlaceholder && standalone.length === 0 && (
        <LoadingAssistantBlock />
      )}
    </div>
  );
}

function makePendingUserMessage(text: string): Message {
  return {
    id: 'pending-user-message',
    role: 'user',
    content: [{ type: 'text', text }],
    createdAt: new Date().toISOString(),
  } as unknown as Message;
}
