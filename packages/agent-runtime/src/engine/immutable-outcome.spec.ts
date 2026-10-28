import { describe, expect, it } from 'vitest';

import { AgentRuntimeError, ProviderError } from '../contracts/errors';
import type { ModelCallOutcome } from '../contracts/hook';
import { MockProvider } from '../providers/mock/mock-provider';
import {
  immutableModelCallOutcome,
  immutableRuntimeError,
} from './immutable-outcome';

const domExceptionCases = [
  { name: 'AbortError', message: 'This operation was aborted' },
  { name: 'TimeoutError', message: 'The operation was aborted due to timeout' },
] as const;

describe('immutableRuntimeError', () => {
  it.each(domExceptionCases)(
    'clones a $name DOMException cause without throwing',
    ({ name, message }) => {
      const cause = new DOMException(message, name);
      const error = new ProviderError('Provider aborted', cause);

      const snapshot = immutableRuntimeError(error);
      const clonedCause = snapshot.cause;

      expect(snapshot).not.toBe(error);
      expect(snapshot).toBeInstanceOf(ProviderError);
      expect(snapshot.name).toBe('ProviderError');
      expect(snapshot.code).toBe('PROVIDER_FAILED');
      expect(clonedCause).not.toBe(cause);
      expect(clonedCause).toBeInstanceOf(DOMException);
      expect(clonedCause).toMatchObject({
        name,
        message,
        code: cause.code,
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(clonedCause)).toBe(true);
    },
  );

  it('clones a top-level DOMException without throwing', () => {
    const error = new DOMException('aborted', 'AbortError');

    const snapshot = immutableRuntimeError(
      error as unknown as AgentRuntimeError,
    );

    expect(snapshot).toBeInstanceOf(DOMException);
    expect(snapshot.name).toBe('AbortError');
    expect(snapshot.message).toBe('aborted');
    expect(snapshot.stack).toBe(error.stack);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('keeps the plain AgentRuntimeError clone contract', () => {
    const cause = new Error('offline');
    const error = new AgentRuntimeError('PROVIDER_FAILED', 'Provider failed', {
      cause,
      details: { attempt: 2 },
    });

    const snapshot = immutableRuntimeError(error);

    expect(snapshot).not.toBe(error);
    expect(snapshot).toBeInstanceOf(AgentRuntimeError);
    expect(snapshot.name).toBe('AgentRuntimeError');
    expect(snapshot.message).toBe('Provider failed');
    expect(snapshot.stack).toBe(error.stack);
    expect(snapshot.code).toBe('PROVIDER_FAILED');
    expect(snapshot.details).toEqual({ attempt: 2 });
    expect(snapshot.details).not.toBe(error.details);
    expect(snapshot.cause).not.toBe(cause);
    expect(snapshot.cause).toBeInstanceOf(Error);
    expect((snapshot.cause as Error).message).toBe('offline');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.details)).toBe(true);
    expect(Object.isFrozen(snapshot.cause)).toBe(true);
    expect(Object.isFrozen(error)).toBe(false);
  });
});

describe('immutableModelCallOutcome', () => {
  it.each(domExceptionCases)(
    'snapshots a provider failure caused by a $name DOMException',
    ({ name, message }) => {
      const cause = new DOMException(message, name);
      const outcome = providerFailureOutcome(
        new ProviderError('Provider aborted', cause),
      );

      const snapshot = immutableModelCallOutcome(outcome);

      expect(snapshot.type).toBe('provider_failure');
      if (snapshot.type !== 'provider_failure') return;
      expect(snapshot.error).toBeInstanceOf(ProviderError);
      expect(snapshot.error.cause).toBeInstanceOf(DOMException);
      expect(snapshot.error.cause).toMatchObject({ name, message });
      expect(snapshot.model).toBe(outcome.model);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.error)).toBe(true);
      expect(Object.isFrozen(snapshot.error.cause)).toBe(true);
      expect(Object.isFrozen(snapshot.providerFailure)).toBe(true);
    },
  );
});

const providerFailureOutcome = (error: ProviderError): ModelCallOutcome => ({
  type: 'provider_failure',
  modelCallId: 'call-1',
  runId: 'run-1',
  turn: 1,
  callSequence: 1,
  trigger: 'initial',
  model: new MockProvider([]),
  message: { role: 'assistant', content: [] },
  usage: {},
  finishReason: null,
  outputState: 'partial',
  providerConsumptionStarted: false,
  producedOutput: false,
  visibleOutput: false,
  durationMs: 1,
  error,
  providerFailure: { kind: 'abort', stage: 'stream_establishment' },
});
