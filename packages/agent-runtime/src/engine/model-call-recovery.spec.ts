import { describe, expect, it, vi } from 'vitest';

import { ProviderError } from '../contracts/errors';
import type { ModelCallOutcome, ModelCallTrigger } from '../contracts/hook';
import type { ProviderFailureFacts } from '../contracts/provider';
import {
  DEFAULT_RETRY_CONFIG,
  type ResolvedRetryConfig,
} from '../contracts/run-input';
import {
  callModelWithRecovery,
  TerminalModelCallError,
  type ModelCallRecoveryOptions,
} from './model-call-recovery';
import { providerRetryDelay, resolveRetryConfig } from './retry-policy';

interface OutcomeOverrides {
  readonly visibleOutput?: boolean;
  readonly producedOutput?: boolean;
  readonly providerConsumptionStarted?: boolean;
  readonly retryAfterMs?: number;
}

const identity = (trigger: ModelCallTrigger, callSequence: number) => ({
  modelCallId: `call-${callSequence}`,
  runId: 'run-1',
  turn: 1,
  callSequence,
  trigger,
  model: { name: 'azure:gpt', stream: vi.fn() },
});

const base = (trigger: ModelCallTrigger, callSequence: number) => ({
  ...identity(trigger, callSequence),
  message: { role: 'assistant' as const, content: [] },
  usage: {},
  finishReason: 'stop' as const,
  providerConsumptionStarted: false,
  producedOutput: false,
  visibleOutput: false,
  durationMs: 1,
});

const midStreamRateLimit = (
  trigger: ModelCallTrigger,
  callSequence: number,
  overrides: OutcomeOverrides = {},
): ModelCallOutcome => {
  const facts: ProviderFailureFacts = {
    kind: 'rate_limit',
    stage: 'stream_consumption',
    upstreamStatus: 429,
    retryAfterMs: overrides.retryAfterMs ?? 0,
  };
  return {
    ...base(trigger, callSequence),
    providerConsumptionStarted: true,
    ...overrides,
    type: 'provider_failure',
    outputState: 'partial',
    error: new ProviderError('rate limited', undefined, facts),
    providerFailure: facts,
  };
};

const contextLengthRejection = (
  trigger: ModelCallTrigger,
  callSequence: number,
  rejectionReason:
    'context_length_exceeded' | 'content_filter' = 'context_length_exceeded',
): ModelCallOutcome => {
  const facts: ProviderFailureFacts = {
    kind: 'rejection',
    stage: 'stream_establishment',
    upstreamStatus: 400,
    rejectionReason,
    contextOverflowTokens: 950,
  };
  return {
    ...base(trigger, callSequence),
    type: 'provider_failure',
    outputState: 'partial',
    error: new ProviderError('prompt is too long', undefined, facts),
    providerFailure: facts,
  };
};

const accepted = (
  trigger: ModelCallTrigger,
  callSequence: number,
): ModelCallOutcome => ({
  ...base(trigger, callSequence),
  providerConsumptionStarted: true,
  producedOutput: true,
  visibleOutput: true,
  type: 'accepted',
  outputState: 'final',
});

type Scripted = (
  trigger: ModelCallTrigger,
  callSequence: number,
) => ModelCallOutcome;

interface Harness {
  readonly calls: ModelCallTrigger[];
  readonly waits: number[];
  readonly run: () => Promise<ModelCallOutcome>;
}

const harness = (
  script: readonly Scripted[],
  maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
  retry: ResolvedRetryConfig = DEFAULT_RETRY_CONFIG,
): Harness => {
  const calls: ModelCallTrigger[] = [];
  const waits: number[] = [];
  const options: ModelCallRecoveryOptions = {
    maxRetries,
    call: async function* (trigger) {
      calls.push(trigger);
      const attempt = script[calls.length - 1];
      if (!attempt) throw new Error(`unscripted attempt ${calls.length}`);
      const outcome = attempt(trigger, calls.length);
      if (outcome.visibleOutput) yield { type: 'text_delta', delta: 'partial' };
      return outcome;
    },
    providerRetryDelay: (outcome, retryNumber) =>
      outcome.type === 'provider_failure'
        ? providerRetryDelay(retry, outcome.providerFailure, retryNumber)
        : undefined,
    waitForProviderRetry: async (delayMs) => {
      waits.push(delayMs);
    },
    isAborted: () => false,
    isHookAborted: () => false,
  };
  const run = async (): Promise<ModelCallOutcome> => {
    const generator = callModelWithRecovery(options);
    let step = await generator.next();
    while (!step.done) step = await generator.next();
    return step.value;
  };
  return { calls, waits, run };
};

const terminalFailure = async (
  harnessed: Harness,
): Promise<TerminalModelCallError> => {
  try {
    await harnessed.run();
  } catch (error) {
    if (error instanceof TerminalModelCallError) return error;
    throw error;
  }
  throw new Error('expected a terminal model call error');
};

const RETRY_CONTEXT_LENGTH = resolveRetryConfig({
  retryableRejectionReasons: ['context_length_exceeded'],
});

describe('callModelWithRecovery for rejections the host retries', () => {
  it('retries a listed rejection reason immediately and accepts the next attempt', async () => {
    const harnessed = harness(
      [contextLengthRejection, accepted],
      DEFAULT_RETRY_CONFIG.maxRetries,
      RETRY_CONTEXT_LENGTH,
    );

    const outcome = await harnessed.run();

    expect(harnessed.calls).toEqual(['initial', 'provider_retry']);
    expect(harnessed.waits).toEqual([]);
    expect(outcome).toMatchObject({ type: 'accepted', callSequence: 2 });
  });

  it('stays terminal for a rejection by default', async () => {
    const harnessed = harness([contextLengthRejection, accepted]);

    const error = await terminalFailure(harnessed);

    expect(harnessed.calls).toEqual(['initial']);
    expect(error.call).toMatchObject({
      providerFailure: {
        rejectionReason: 'context_length_exceeded',
        contextOverflowTokens: 950,
      },
    });
  });

  it('stays terminal for a rejection with an unlisted reason', async () => {
    const harnessed = harness(
      [
        (trigger, sequence) =>
          contextLengthRejection(trigger, sequence, 'content_filter'),
        accepted,
      ],
      DEFAULT_RETRY_CONFIG.maxRetries,
      RETRY_CONTEXT_LENGTH,
    );

    await terminalFailure(harnessed);

    expect(harnessed.calls).toEqual(['initial']);
  });

  it('stops retrying a listed rejection once the budget is exhausted', async () => {
    const harnessed = harness(
      [contextLengthRejection, contextLengthRejection, accepted],
      1,
      RETRY_CONTEXT_LENGTH,
    );

    await terminalFailure(harnessed);

    expect(harnessed.calls).toEqual(['initial', 'provider_retry']);
  });
});

describe('resolveRetryConfig rejection reasons', () => {
  it('defaults to retrying no rejection', () => {
    expect(resolveRetryConfig().retryableRejectionReasons).toEqual([]);
  });

  it('rejects reasons that are not non-empty strings', () => {
    expect(() =>
      resolveRetryConfig({ retryableRejectionReasons: [''] as never }),
    ).toThrow('retry.retryableRejectionReasons must contain rejection reasons');
  });
});

describe('callModelWithRecovery for mid-stream rate limits', () => {
  it('retries a stream-consumption rate limit with retryAfterMs 0 before visible output and accepts the next attempt', async () => {
    const harnessed = harness([
      (trigger, sequence) => midStreamRateLimit(trigger, sequence),
      accepted,
    ]);

    const outcome = await harnessed.run();

    expect(harnessed.calls).toEqual(['initial', 'provider_retry']);
    expect(harnessed.waits).toEqual([]);
    expect(outcome).toMatchObject({
      type: 'accepted',
      trigger: 'provider_retry',
      callSequence: 2,
    });
  });

  it('waits the provider-requested delay before retrying a non-visible rate limit', async () => {
    const harnessed = harness([
      (trigger, sequence) =>
        midStreamRateLimit(trigger, sequence, { retryAfterMs: 7_000 }),
      accepted,
    ]);

    await harnessed.run();

    expect(harnessed.calls).toEqual(['initial', 'provider_retry']);
    expect(harnessed.waits).toEqual([7_000]);
  });

  it('retries when a consumed chunk produced buffered but not yet visible output', async () => {
    const harnessed = harness([
      (trigger, sequence) =>
        midStreamRateLimit(trigger, sequence, {
          producedOutput: true,
          visibleOutput: false,
        }),
      accepted,
    ]);

    await harnessed.run();

    expect(harnessed.calls).toEqual(['initial', 'provider_retry']);
  });

  it('stays terminal on the first attempt once output reached the consumer', async () => {
    const harnessed = harness([
      (trigger, sequence) =>
        midStreamRateLimit(trigger, sequence, {
          producedOutput: true,
          visibleOutput: true,
        }),
      accepted,
    ]);

    const error = await terminalFailure(harnessed);

    expect(harnessed.calls).toEqual(['initial']);
    expect(error.call).toMatchObject({
      type: 'provider_failure',
      trigger: 'initial',
      visibleOutput: true,
      providerFailure: { kind: 'rate_limit', stage: 'stream_consumption' },
    });
  });

  it('stays terminal once the retry budget is exhausted', async () => {
    const failing: Scripted = (trigger, sequence) =>
      midStreamRateLimit(trigger, sequence);
    const harnessed = harness([failing, failing, failing, failing, accepted]);

    const error = await terminalFailure(harnessed);

    expect(harnessed.calls).toEqual([
      'initial',
      'provider_retry',
      'provider_retry',
      'provider_retry',
    ]);
    expect(error.call).toMatchObject({
      type: 'provider_failure',
      trigger: 'provider_retry',
      callSequence: 4,
    });
  });

  it('stays terminal when the requested wait exceeds the accepted cap', async () => {
    const harnessed = harness([
      (trigger, sequence) =>
        midStreamRateLimit(trigger, sequence, {
          retryAfterMs: DEFAULT_RETRY_CONFIG.retryAfter.maxWaitMs + 1,
        }),
      accepted,
    ]);

    const error = await terminalFailure(harnessed);

    expect(harnessed.calls).toEqual(['initial']);
    expect(error.call).toMatchObject({ trigger: 'initial' });
  });
});
