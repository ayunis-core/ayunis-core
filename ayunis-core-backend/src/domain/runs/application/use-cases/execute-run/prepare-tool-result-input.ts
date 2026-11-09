import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { RunToolResultInput } from 'src/domain/runs/domain/run-input.entity';
import {
  addToolResultTruncationNotice,
  limitToolResult,
  truncateAnonymousToolResult,
} from 'src/domain/runs/application/helpers/limit-tool-result.helper';
import { findPendingToolCall } from './pending-tool-call.helper';

type Anonymize = (
  text: string,
) => Promise<{ anonymizedText: string; masks: ThreadPiiMask[] }>;

/**
 * Binds a posted result to its pending call and bounds its size; in an
 * anonymous thread the text is anonymized first.
 */
export async function prepareToolResultInput(
  thread: Thread,
  isAnonymous: boolean,
  input: RunToolResultInput,
  anonymize: Anonymize,
): Promise<{ input: RunToolResultInput; masks: ThreadPiiMask[] | null }> {
  const pending = findPendingToolCall(thread, input.toolId);
  if (!isAnonymous) {
    return {
      input: new RunToolResultInput(
        pending.id,
        pending.name,
        limitToolResult(input.result),
      ),
      masks: null,
    };
  }
  const limited = truncateAnonymousToolResult(input.result);
  const anonymized = await anonymize(limited.result);
  const result = limited.truncated
    ? addToolResultTruncationNotice(anonymized.anonymizedText)
    : anonymized.anonymizedText;
  return {
    input: new RunToolResultInput(
      pending.id,
      pending.name,
      limitToolResult(result),
    ),
    masks: anonymized.masks,
  };
}
