import { useRef } from 'react';
import { Avatar, AvatarFallback } from '@/shared/ui/shadcn/avatar';
import { useTheme } from '@/features/theme';
import { cn } from '@/shared/lib/shadcn/utils';
import brandIconLight from '@/shared/assets/brand/brand-icon-round-light.svg';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';
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
  const { theme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const hasFinalText = unit.finalText.length > 0;

  return (
    <div
      className={cn('flex flex-col items-start gap-2', !hideAvatar && 'mt-4')}
    >
      {!hideAvatar && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <img
              src={theme === 'dark' ? brandIconDark : brandIconLight}
              alt="Ayunis Logo"
              className="h-8 w-8 object-contain"
            />
          </AvatarFallback>
        </Avatar>
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
