import { useCallback } from 'react';
import {
  AgentRunTimeline,
  type AgentRunTimelineProps,
  type TimelinePresentation,
} from '@ayunis/chat/timeline';
import type { MarkdownProps } from '@ayunis/chat/markdown';
import { Markdown } from '@/widgets/markdown';
import { useTrackProductiveOutcome } from '@/shared/lib/openpanel-outcomes';
import ResponseStartOrb from '@/pages/chat/ui/ResponseStartOrb';
import { chatToolCards } from '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations';

function TimelineMarkdown(props: Readonly<MarkdownProps>) {
  const trackOutcome = useTrackProductiveOutcome();
  const onCodeCopied = useCallback(
    () => trackOutcome({ outcome_type: 'code_copied', output_type: 'code' }),
    [trackOutcome],
  );
  return <Markdown {...props} onCodeCopied={onCodeCopied} />;
}

const presentation: TimelinePresentation = {
  toolCards: chatToolCards,
  Markdown: TimelineMarkdown,
  pendingIndicator: <ResponseStartOrb />,
};

export default function AppAgentRunTimeline(
  props: Readonly<Omit<AgentRunTimelineProps, 'presentation'>>,
) {
  return <AgentRunTimeline {...props} presentation={presentation} />;
}
