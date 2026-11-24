import type { ReactNode } from 'react';
import { ChatMessageList } from '@ayunis/chat/messages';
import ChatMessage from '@/pages/chat/ui/ChatMessage';
import AssistantRunBlock from '@/pages/chat/ui/AssistantRunBlock';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import {
  AgentRunTimeline,
  type AgentRunUnit,
  type RenderUnit,
  type SourceProcessingTimelineStep,
} from '@/pages/chat/ui/agent-run-timeline';
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
  const waitingSteps =
    pendingSubmission === null ? [] : (props.processingSteps ?? []);
  return (
    <ChatMessageList<AgentRunUnit>
      units={units}
      pendingSubmission={pendingSubmission}
      contextHint={contextHint}
      renderUser={(message) => <ChatMessage message={message} />}
      renderRun={(unit, grouped) => (
        <AssistantRunBlock
          unit={unit}
          isGroupedWithPrevious={grouped}
          threadId={threadId}
          onOpenArtifact={onOpenArtifact}
        />
      )}
      waiting={
        waitingSteps.length > 0 ? (
          <AgentRunTimeline unit={sourceProcessingRun(waitingSteps)} />
        ) : undefined
      }
      loading={
        showLoadingPlaceholder && waitingSteps.length === 0 ? (
          <LoadingAssistantBlock />
        ) : undefined
      }
    />
  );
}
