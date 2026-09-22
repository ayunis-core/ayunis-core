import type { ProviderFailureFacts, Usage } from './provider';

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

export class InvalidRunInputError extends AgentRuntimeError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super('INVALID_INPUT', message, { details });
  }
}

export class MaxIterationsError extends AgentRuntimeError {
  constructor(maxIterations: number) {
    super(
      'MAX_ITERATIONS_REACHED',
      `Run reached the maximum of ${maxIterations} iterations`,
      { details: { maxIterations } },
    );
  }
}

export class RunAbortedError extends AgentRuntimeError {
  constructor(reason?: string) {
    super('RUN_ABORTED', reason ?? 'Run aborted');
  }
}

export class ProviderError extends AgentRuntimeError {
  readonly providerFailure?: ProviderFailureFacts;

  constructor(
    message: string,
    cause?: unknown,
    providerFailure?: ProviderFailureFacts,
  ) {
    super('PROVIDER_FAILED', message, {
      cause,
      ...(providerFailure ? { details: { providerFailure } } : {}),
    });
    this.providerFailure = providerFailure;
  }
}

export class MalformedToolCallError extends AgentRuntimeError {
  readonly usage?: Usage;

  constructor(
    details: {
      toolNames: readonly (string | null)[];
      reason:
        | 'unparseable_arguments'
        | 'token_limit_reached'
        | 'tool_disabled_fallback';
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

export class RepeatedToolFailureError extends AgentRuntimeError {
  constructor(details: { toolName: string; failureCount: number }) {
    super(
      'TOOL_REPEATEDLY_FAILING',
      `Tool '${details.toolName}' failed ${details.failureCount} consecutive times with the same error`,
      { details },
    );
  }
}

export class HookFailedError extends AgentRuntimeError {
  constructor(options: {
    hookName: string;
    phase: string;
    cause: unknown;
    underlyingError?: AgentRuntimeError;
    originalOutcome?: string;
  }) {
    const reason =
      options.cause instanceof Error ? options.cause.message : 'unknown error';
    super(
      'HOOK_FAILED',
      `Hook '${options.hookName}' failed in ${options.phase}: ${reason}`,
      {
        details: {
          hookName: options.hookName,
          phase: options.phase,
          ...(options.originalOutcome
            ? { originalOutcome: options.originalOutcome }
            : {}),
          ...(options.underlyingError
            ? {
                underlyingError: serializeRuntimeError(options.underlyingError),
              }
            : {}),
        },
        cause: options.cause,
      },
    );
  }
}

const serializeRuntimeError = (
  error: AgentRuntimeError,
): Readonly<Record<string, unknown>> => ({
  code: error.code,
  message: error.message,
  ...(error.details ? { details: error.details } : {}),
});
