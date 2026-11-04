import { Fragment, type ReactNode } from 'react';
import ChatMessage from '@/pages/chat/ui/ChatMessage';
import AssistantRunBlock from '@/pages/chat/ui/AssistantRunBlock';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import type { RenderUnit } from '@/pages/chat/ui/agent-run-timeline';
import type { Message } from '@/pages/chat/model/openapi';

interface ChatThreadContentProps {
  readonly renderUnits: readonly RenderUnit[];
  readonly threadId: string;
  readonly pendingSubmission: string | null;
  readonly contextHint: ReactNode;
  readonly showLoadingPlaceholder: boolean;
  readonly onOpenArtifact: (artifactId: string) => void;
}

export function ChatThreadContent({
  renderUnits,
  threadId,
  pendingSubmission,
  contextHint,
  showLoadingPlaceholder,
  onOpenArtifact,
}: ChatThreadContentProps) {
  const showPendingUserBubble = pendingSubmission !== null;
  const firstUserUnitIndex = renderUnits.findIndex(
    (unit) => unit.kind === 'user',
  );

  return (
    <div className="p-4 pb-8">
      {renderUnits.map((unit, i) => {
        if (unit.kind === 'user') {
          return (
            <Fragment key={unit.key}>
              {i === firstUserUnitIndex && contextHint}
              <ChatMessage message={unit.message} />
            </Fragment>
          );
        }
        const previousUnit = i > 0 ? renderUnits[i - 1] : undefined;
        const isGroupedWithPrevious = previousUnit?.kind === 'agent-run';
        return (
          <AssistantRunBlock
            key={unit.key}
            unit={unit}
            isGroupedWithPrevious={isGroupedWithPrevious}
            threadId={threadId}
            onOpenArtifact={onOpenArtifact}
          />
        );
      })}
      {showPendingUserBubble && (
        <>
          {firstUserUnitIndex === -1 && contextHint}
          <ChatMessage
            key="pending-user"
            message={makePendingUserMessage(pendingSubmission)}
          />
        </>
      )}
      {showLoadingPlaceholder && <LoadingAssistantBlock />}
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
