import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

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
 * Error thrown when an unexpected error occurs
 */
export class UnexpectedRunError extends RunError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, RunErrorCode.UNEXPECTED_RUN_ERROR, 500, {
      ...metadata,
      error,
    });
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

// CreditBudgetExceededError moved to iam/subscriptions — re-export for backward compatibility
export { CreditBudgetExceededError } from '../../../iam/subscriptions/application/subscription.errors';
