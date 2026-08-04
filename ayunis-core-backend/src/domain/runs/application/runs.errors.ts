import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Error codes specific to the Runs domain
 */
export enum RunErrorCode {
  RUN_EXECUTION_FAILED = 'RUN_EXECUTION_FAILED',
  RUN_INVALID_INPUT = 'RUN_INVALID_INPUT',
  RUN_MAX_ITERATIONS_REACHED = 'RUN_MAX_ITERATIONS_REACHED',
  RUN_TOOL_NOT_FOUND = 'RUN_TOOL_NOT_FOUND',
  RUN_TOOL_EXECUTION_FAILED = 'RUN_TOOL_EXECUTION_FAILED',
  RUN_NO_MODEL_FOUND = 'RUN_NO_MODEL_FOUND',
  RUN_ANONYMIZATION_UNAVAILABLE = 'RUN_ANONYMIZATION_UNAVAILABLE',
  UNEXPECTED_RUN_ERROR = 'UNEXPECTED_RUN_ERROR',
  RUN_CONTEXT_BUDGET_EXCEEDED = 'RUN_CONTEXT_BUDGET_EXCEEDED',
}

/**
 * Base run error that all run-specific errors should extend
 */
export abstract class RunError extends ApplicationError {
  constructor(
    message: string,
    code: RunErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/**
 * Error thrown when run execution fails
 */
export class RunExecutionFailedError extends RunError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Run execution failed: ${reason}`,
      RunErrorCode.RUN_EXECUTION_FAILED,
      500,
      metadata,
    );
  }
}

export class UnexpectedRunError extends RunError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected error while executing run',
      RunErrorCode.UNEXPECTED_RUN_ERROR,
      500,
      {
        ...metadata,
        error,
      },
    );
  }
}

/**
 * Error thrown when run input is invalid
 */
export class RunInvalidInputError extends RunError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid run input: ${reason}`,
      RunErrorCode.RUN_INVALID_INPUT,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when run reaches max iterations
 */
export class RunMaxIterationsReachedError extends RunError {
  constructor(iterations: number, metadata?: ErrorMetadata) {
    super(
      `Run reached maximum iterations (${iterations})`,
      RunErrorCode.RUN_MAX_ITERATIONS_REACHED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when a tool is not found
 */
export class RunToolNotFoundError extends RunError {
  constructor(toolName: string, metadata?: ErrorMetadata) {
    super(
      `Tool '${toolName}' not found`,
      RunErrorCode.RUN_TOOL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when no model is found
 */
export class RunNoModelFoundError extends RunError {
  constructor(metadata?: ErrorMetadata) {
    super('No model found', RunErrorCode.RUN_NO_MODEL_FOUND, 404, metadata);
  }
}

/**
 * Error thrown when a tool execution fails
 */
export class RunToolExecutionFailedError extends RunError {
  constructor(toolName: string, metadata?: ErrorMetadata) {
    super(
      `Tool '${toolName}' execution failed`,
      RunErrorCode.RUN_TOOL_EXECUTION_FAILED,
      400,
      metadata,
    );
  }
}

/**
 * A tool failed several consecutive times with the identical error, so the
 * run's feedback loop was not converging and the loop was aborted (AYC-646).
 * Shares RunToolExecutionFailedError's code and presentation, but the
 * distinct type tells the run loops to preserve the persisted tool-result
 * transcript instead of rolling the turn back — the failed attempts are the
 * record of what happened, and deleting them would re-arm the pending tool
 * calls for the next run.
 */
export class RunToolRepeatedlyFailingError extends RunToolExecutionFailedError {
  constructor(toolName: string, failureCount: number) {
    super(toolName, { failureCount, reason: 'repeated identical failures' });
  }
}

/**
 * Error thrown when anonymous mode is enabled but the anonymization service
 * is unavailable. The message must not be sent without anonymization.
 */
export class RunAnonymizationUnavailableError extends RunError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Anonymization is currently unavailable. Your message was not sent to protect your data.',
      RunErrorCode.RUN_ANONYMIZATION_UNAVAILABLE,
      503,
      metadata,
    );
  }
}

export class RunContextBudgetExceededError extends RunError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The latest conversation turn is too large for the model context window.',
      RunErrorCode.RUN_CONTEXT_BUDGET_EXCEEDED,
      400,
      metadata,
    );
  }
}

// CreditBudgetExceededError moved to iam/subscriptions — re-export for backward compatibility
export { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
