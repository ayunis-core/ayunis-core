import type { TimelinePresentation } from '@ayunis/chat/timeline';
import ResponseStartOrb from '@/pages/chat/ui/ResponseStartOrb';
import { chatToolCards } from './tool-card-registrations';
import TimelineMarkdown from '@/pages/chat/ui/agent-run-timeline/ui/TimelineMarkdown';

export const appTimelinePresentation: TimelinePresentation = {
  toolCards: chatToolCards,
  Markdown: TimelineMarkdown,
  pendingIndicator: <ResponseStartOrb />,
};
