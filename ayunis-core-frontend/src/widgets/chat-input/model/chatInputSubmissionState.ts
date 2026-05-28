import type { ChatInputSubmissionState } from '../ui/ChatInput';

export function getChatInputSubmissionState(
  isStreaming: boolean,
  pendingSubmission: string | null,
): ChatInputSubmissionState {
  if (isStreaming) return 'streaming';
  if (pendingSubmission !== null) return 'submitting';
  return 'idle';
}
