import { useRef } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import { AgentRunTimeline } from '@/pages/chat/ui/agent-run-timeline';
import type { AgentRunUnit } from '@/pages/chat/ui/agent-run-timeline';
import CopyAssistantTextButton from './CopyAssistantTextButton';

interface AssistantRunBlockProps {
  unit: AgentRunUnit;
  /** Tightens the top spacing when the previous unit is also an agent run. */
  isGroupedWithPrevious: boolean;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

export default function AssistantRunBlock({
  unit,
  isGroupedWithPrevious,
  threadId,
  onOpenArtifact,
}: Readonly<AssistantRunBlockProps>) {
  const contentRef = useRef<HTMLDivElement>(null);
  const hasText = unit.blocks.some((block) => block.kind === 'text');

  return (
    <div
      className={cn(
        'flex flex-col items-start gap-2',
        !isGroupedWithPrevious && 'mt-4',
      )}
    >
      <div className="max-w-2xl min-w-0 space-y-1 w-full">
        <div
          ref={contentRef}
          className="space-y-2 overflow-hidden w-full"
          data-testid="assistant-message"
        >
          <AgentRunTimeline
            unit={unit}
            threadId={threadId}
            onOpenArtifact={onOpenArtifact}
          />
        </div>
        {hasText && <CopyAssistantTextButton contentRef={contentRef} />}
      </div>
    </div>
  );
}
