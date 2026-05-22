import ChatMessage from '@/pages/chat/ui/ChatMessage';
import AssistantRunBlock from '@/pages/chat/ui/AssistantRunBlock';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import type { RenderUnit } from '@/pages/chat/ui/agent-run-timeline';
import type { Message } from '@/pages/chat/model/openapi';

interface ChatThreadContentProps {
  readonly renderUnits: readonly RenderUnit[];
  readonly threadId: string;
  readonly pendingSubmission: string | null;
  readonly showLoadingPlaceholder: boolean;
  readonly onOpenArtifact: (artifactId: string) => void;
}

export function ChatThreadContent({
  renderUnits,
  threadId,
  pendingSubmission,
  showLoadingPlaceholder,
  onOpenArtifact,
}: ChatThreadContentProps) {
  const showPendingUserBubble = pendingSubmission !== null;

  return (
    <div className="p-4 pb-8">
      {renderUnits.map((unit, i) => {
        if (unit.kind === 'user') {
          return <ChatMessage key={unit.key} message={unit.message} />;
        }
        const previousUnit = i > 0 ? renderUnits[i - 1] : undefined;
        const hideAvatar = previousUnit?.kind === 'agent-run';
        return (
          <AssistantRunBlock
            key={unit.key}
            unit={unit}
            hideAvatar={hideAvatar}
            threadId={threadId}
            onOpenArtifact={onOpenArtifact}
          />
        );
      })}
      {showPendingUserBubble && (
        <ChatMessage
          key="pending-user"
          message={makePendingUserMessage(pendingSubmission)}
        />
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
