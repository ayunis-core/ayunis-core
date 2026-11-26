import {
  AgentRunTimeline,
  type AgentRunTimelineProps,
} from '@ayunis/chat/timeline';
import { appTimelinePresentation } from '@/pages/chat/ui/agent-run-timeline/lib/app-timeline-presentation';

export default function AppAgentRunTimeline(
  props: Readonly<Omit<AgentRunTimelineProps, 'presentation'>>,
) {
  return <AgentRunTimeline {...props} presentation={appTimelinePresentation} />;
}
