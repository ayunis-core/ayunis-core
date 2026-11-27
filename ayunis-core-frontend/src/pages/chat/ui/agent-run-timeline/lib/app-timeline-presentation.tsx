import type { TimelinePresentation } from '@ayunis/chat/timeline';
import ResponseStartOrb from '@/pages/chat/ui/ResponseStartOrb';
import { chatToolCards } from './tool-card-registrations';

export const appTimelinePresentation: TimelinePresentation = {
  toolCards: chatToolCards,
  pendingIndicator: <ResponseStartOrb />,
};
