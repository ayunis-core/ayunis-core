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
