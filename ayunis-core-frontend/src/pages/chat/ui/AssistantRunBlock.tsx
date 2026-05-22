import { useRef } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';
import { AyunisProgressOrb } from '@/widgets/ayunis-progress-orb';
import { AgentRunTimeline } from '@/pages/chat/ui/agent-run-timeline';
import type { AgentRunUnit } from '@/pages/chat/ui/agent-run-timeline';
import CopyAssistantTextButton from './CopyAssistantTextButton';

interface AssistantRunBlockProps {
  unit: AgentRunUnit;
  hideAvatar: boolean;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

export default function AssistantRunBlock({
  unit,
  hideAvatar,
  threadId,
  onOpenArtifact,
}: Readonly<AssistantRunBlockProps>) {
  const contentRef = useRef<HTMLDivElement>(null);
  const hasFinalText = unit.finalText.length > 0;

  return (
    <div
      className={cn('flex flex-col items-start gap-2', !hideAvatar && 'mt-4')}
    >
      {!hideAvatar && (
        <AyunisProgressOrb isActive={unit.isStreaming} aria-label="Ayunis" />
      )}
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
        {hasFinalText && <CopyAssistantTextButton contentRef={contentRef} />}
      </div>
    </div>
  );
}
