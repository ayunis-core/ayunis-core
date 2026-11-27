import type { TimelinePresentation } from '@ayunis/chat/timeline';
import { chatToolCards } from './tool-card-registrations';

export const appTimelinePresentation: TimelinePresentation = {
  toolCards: chatToolCards,
};
