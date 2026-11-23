import { memo } from 'react';
import { AssistantMessageFrame } from '@ayunis/chat/messages';
import { AgentRunTimeline } from '@/pages/chat/ui/agent-run-timeline';
import type { AgentRunUnit } from '@/pages/chat/ui/agent-run-timeline';
import CopyAssistantTextButton from './CopyAssistantTextButton';
import ReadAloudButton from './ReadAloudButton';
import { hasSpeakableText } from '@/pages/chat/lib/speakable-message-text';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';

interface AssistantRunBlockProps {
  unit: AgentRunUnit;
  /** Tightens the top spacing when the previous unit is also an agent run. */
  isGroupedWithPrevious: boolean;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

function AssistantRunBlock({
  unit,
  isGroupedWithPrevious,
  threadId,
  onOpenArtifact,
}: Readonly<AssistantRunBlockProps>) {
  const isEmbedded = useEmbedded();
  const hasText = unit.blocks.some((block) => block.kind === 'text');
  const canReadAloud =
    !isEmbedded &&
    !unit.isStreaming &&
    unit.blocks.some(
      (block) => block.kind === 'text' && hasSpeakableText(block.content.text),
    );

  return (
    <AssistantMessageFrame
      grouped={isGroupedWithPrevious}
      actions={
        hasText
          ? (contentRef) => (
              <>
                <CopyAssistantTextButton contentRef={contentRef} />
                {canReadAloud && (
                  <ReadAloudButton
                    messageKey={unit.key}
                    contentRef={contentRef}
                  />
                )}
              </>
            )
          : undefined
      }
    >
      <AgentRunTimeline
        unit={unit}
        threadId={threadId}
        onOpenArtifact={onOpenArtifact}
      />
    </AssistantMessageFrame>
  );
}

export default memo(AssistantRunBlock);
