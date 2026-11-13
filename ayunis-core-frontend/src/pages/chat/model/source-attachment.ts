import type { SourceProcessingTimelineStep } from '@/pages/chat/ui/agent-run-timeline';

export interface SourceAttachment {
  id: string;
  origin: 'source' | 'upload';
  messageId?: string;
  step: SourceProcessingTimelineStep;
}
