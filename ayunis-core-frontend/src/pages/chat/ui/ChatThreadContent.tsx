import { Fragment, type ReactNode } from 'react';
import ChatMessage from '@/pages/chat/ui/ChatMessage';
import AssistantRunBlock from '@/pages/chat/ui/AssistantRunBlock';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import {
  AgentRunTimeline,
  type RenderUnit,
  type SourceProcessingTimelineStep,
} from '@/pages/chat/ui/agent-run-timeline';
import type { Message } from '@/pages/chat/model/openapi';
import { sourceProcessingRun } from '@/pages/chat/lib/source-processing-steps';

interface ChatThreadContentProps {
  readonly renderUnits: readonly RenderUnit[];
  readonly threadId: string;
  readonly pendingSubmission: string | null;
  /** Files a waiting message still depends on; shown only until they are ready. */
  readonly processingSteps?: SourceProcessingTimelineStep[];
  readonly contextHint: ReactNode;
  readonly showLoadingPlaceholder: boolean;
  readonly onOpenArtifact: (artifactId: string) => void;
}

export function ChatThreadContent(props: ChatThreadContentProps) {
  const {
    renderUnits: units,
    threadId,
    pendingSubmission,
    contextHint,
    showLoadingPlaceholder,
    onOpenArtifact,
  } = props;
  const firstUserUnitIndex = units.findIndex((unit) => unit.kind === 'user');
  const waitingSteps =
    pendingSubmission === null ? [] : (props.processingSteps ?? []);

  return (
    <div className="p-4 pb-8">
      {units.map((unit, index) => {
        if (unit.kind === 'user')
          return (
            <Fragment key={unit.key}>
              {index === firstUserUnitIndex && contextHint}
              <ChatMessage message={unit.message} />
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
      {pendingSubmission !== null && (
        <>
          {firstUserUnitIndex === -1 && contextHint}
          <div data-testid="pending-user-message">
            <ChatMessage message={makePendingUserMessage(pendingSubmission)} />
          </div>
        </>
      )}
      {waitingSteps.length > 0 && (
        <div className="mt-4 max-w-2xl">
          <AgentRunTimeline unit={sourceProcessingRun(waitingSteps)} />
        </div>
      )}
      {showLoadingPlaceholder && waitingSteps.length === 0 && (
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
