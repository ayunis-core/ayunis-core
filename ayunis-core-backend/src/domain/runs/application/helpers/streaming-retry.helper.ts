import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import {
  InferenceMalformedToolCallError,
  InferenceStreamStalledError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { RunExecutionFailedError } from 'src/domain/runs/application/runs.errors';

/**
 * Tool-call deltas do not count as durable output because corrupt calls are
 * never persisted. Text or thinking does count: retrying after either streams
 * would duplicate content the user already saw.
 */
export interface OutputTracker {
  producedOutput: boolean;
  yieldedContent: boolean;
}

export const freshOutputTracker = (): OutputTracker => ({
  producedOutput: false,
  yieldedContent: false,
});

export function assertRetryProducedContent(
  assistantMessage: AssistantMessage,
): void {
  if (assistantMessage.content.length === 0) {
    throw new RunExecutionFailedError(
      'No final message received from streaming inference',
    );
  }
}

export function withMalformedToolCallDiagnostics(
  error: unknown,
  model: LanguageModel,
  failureMode: 'retry_exhausted' | 'after_partial_output',
): unknown {
  if (!(error instanceof InferenceMalformedToolCallError)) return error;
  return new InferenceMalformedToolCallError({
    ...error.metadata,
    provider: model.provider,
    model: model.name,
    failureMode,
  });
}

export function isRetryableBeforeOutput(
  error: unknown,
): error is
  | InferenceMalformedToolCallError
  | InferenceStreamStalledError
  | InferenceTokenLimitError {
  return (
    error instanceof InferenceMalformedToolCallError ||
    error instanceof InferenceStreamStalledError ||
    error instanceof InferenceTokenLimitError
  );
}
