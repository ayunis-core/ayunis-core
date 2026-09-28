import type { ProviderChunk, Usage } from '@ayunis/inference';
import type {
  InferenceCallTerminal,
  InferenceCallTerminalHandler,
  InferenceCallUsage,
} from 'src/domain/models/application/models/inference-call-terminal';
import { InferenceStreamStalledError } from 'src/domain/models/application/models.errors';

type CallOutcome = InferenceCallTerminal['outcome'];

/**
 * Observes one provider call so its terminal accounting sees the latest
 * reported value of each cumulative usage dimension, and only fires for calls
 * that completed or were consumed before failing.
 */
export class InferenceCallTracker {
  private consumed = false;
  private inputTokens?: number;
  private outputTokens?: number;
  private cacheReadInputTokens?: number;
  private cacheWriteInputTokens?: number;
  private usageReported = false;

  async *track(
    stream: AsyncIterable<ProviderChunk>,
  ): AsyncIterable<ProviderChunk> {
    for await (const chunk of stream) {
      this.consumed = true;
      this.record(chunk.usage);
      yield chunk;
    }
  }

  async settle(
    outcome: CallOutcome,
    onTerminal: InferenceCallTerminalHandler | undefined,
  ): Promise<void> {
    if (!onTerminal) return;
    if (outcome !== 'completed' && !this.consumed) return;
    await onTerminal({ outcome, usage: this.usage() });
  }

  private record(usage: Usage | undefined): void {
    if (!usage) return;
    if (usage.inputTokens !== undefined) this.inputTokens = usage.inputTokens;
    if (usage.outputTokens !== undefined)
      this.outputTokens = usage.outputTokens;
    if (usage.cacheReadInputTokens !== undefined)
      this.cacheReadInputTokens = usage.cacheReadInputTokens;
    if (usage.cacheWriteInputTokens !== undefined)
      this.cacheWriteInputTokens = usage.cacheWriteInputTokens;
    this.usageReported ||= [
      usage.inputTokens,
      usage.outputTokens,
      usage.cacheReadInputTokens,
      usage.cacheWriteInputTokens,
    ].some((value) => value !== undefined);
  }

  private usage(): InferenceCallUsage | undefined {
    if (!this.usageReported) return undefined;
    return {
      inputTokens:
        (this.inputTokens ?? 0) +
        (this.cacheReadInputTokens ?? 0) +
        (this.cacheWriteInputTokens ?? 0),
      outputTokens: this.outputTokens ?? 0,
    };
  }
}

export function failedCallOutcome(
  error: unknown,
  signal?: AbortSignal,
): Exclude<CallOutcome, 'completed'> {
  if (signal?.reason instanceof InferenceStreamStalledError) return 'failed';
  return signal?.aborted || isAbortError(error) ? 'aborted' : 'failed';
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'abort'
  );
}
