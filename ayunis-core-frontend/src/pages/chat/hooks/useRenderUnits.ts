import {
  useRenderUnits as useTimelineUnits,
  type GroupingOptions,
} from '@ayunis/chat/timeline';
import type { Message } from '@/pages/chat/model/openapi';
import { chatToolCards } from '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations';

export function useRenderUnits(
  messages: readonly Message[],
  options: Omit<GroupingOptions, 'toolCards'>,
) {
  return useTimelineUnits(messages, { ...options, toolCards: chatToolCards });
}
