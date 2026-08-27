import type { Usage } from './provider';

export class AgentRuntimeError extends Error {
  readonly code: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: string,
    message: string,
    options?: {
      details?: Readonly<Record<string, unknown>>;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = new.target.name;
    this.code = code;
    this.details = options?.details;
  }
}

/** Thrown synchronously by run() on invalid input — the only throwing path. */
export class InvalidRunInputError extends AgentRuntimeError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super('INVALID_INPUT', message, { details });
  }
}

/** Surfaced as an `error` event + `run_end { status: 'max_iterations' }`. */
export class MaxIterationsError extends AgentRuntimeError {
  constructor(maxIterations: number) {
    super(
      'MAX_ITERATIONS_REACHED',
      `Run reached the maximum of ${maxIterations} iterations`,
      { details: { maxIterations } },
    );
  }
}

/** Surfaced as `run_end { status: 'aborted' }`. */
export class RunAbortedError extends AgentRuntimeError {
  constructor(reason?: string) {
    super('RUN_ABORTED', reason ?? 'Run aborted');
  }
}

/** Wraps model provider failures; surfaced as an `error` event. */
export class ProviderError extends AgentRuntimeError {
  constructor(message: string, cause?: unknown) {
    super('PROVIDER_FAILED', message, { cause });
  }
}

/**
 * The model emitted a tool call whose arguments did not arrive intact —
 * unparseable JSON, or the token limit was reached mid-call. The runtime may
 * retry the model turn before visible output, but it never executes guessed
 * tool input; surfaced as an `error` event when recovery is unsafe or exhausted.
 */
export class MalformedToolCallError extends AgentRuntimeError {
  readonly usage?: Usage;

  constructor(
    details: {
      toolNames: readonly (string | null)[];
      reason: 'unparseable_arguments' | 'token_limit_reached';
    },
    options?: { usage?: Usage },
  ) {
    super(
      'MALFORMED_TOOL_CALL',
      'Model emitted a tool call whose arguments did not arrive intact',
      { details },
    );
    this.usage = options?.usage;
  }
}

/**
 * A tool failed several consecutive times with the identical error — the
 * model is not converging on a working call, so the run stops instead of
 * repeating the attempt until the iteration cap; surfaced as an `error`
 * event.
 */
export class RepeatedToolFailureError extends AgentRuntimeError {
  constructor(details: { toolName: string; failureCount: number }) {
    super(
      'TOOL_REPEATEDLY_FAILING',
      `Tool '${details.toolName}' failed ${details.failureCount} consecutive times with the same error`,
      { details },
    );
  }
}

/**
 * Wraps a hook failure with the hook's name and the phase it failed in,
 * so multi-hook runs stay debuggable; surfaced as an `error` event.
 */
export class HookFailedError extends AgentRuntimeError {
  constructor(options: { hookName: string; phase: string; cause: unknown }) {
    const reason =
      options.cause instanceof Error ? options.cause.message : 'unknown error';
    super(
      'HOOK_FAILED',
      `Hook '${options.hookName}' failed in ${options.phase}: ${reason}`,
      {
        details: { hookName: options.hookName, phase: options.phase },
        cause: options.cause,
      },
    );
  }
}
