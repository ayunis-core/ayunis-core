import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { listClientToolCalls } from '@ayunis/chat/runs';
import {
  isOutlookTool,
  type OutlookToolName,
} from '@/features/outlook-tools/lib/outlook-tool-names';

type ThreadMessage = GetThreadResponseDto['messages'][number];

export interface OutlookToolCall {
  id: string;
  name: OutlookToolName;
  params: Record<string, unknown>;
}

/** Finished, valid Outlook client calls in message order. */
export function outlookToolCalls(
  messages: readonly ThreadMessage[],
): OutlookToolCall[] {
  return listClientToolCalls(messages).filter((call): call is OutlookToolCall =>
    isOutlookTool(call.name),
  );
}
