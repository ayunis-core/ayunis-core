import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

/**
 * Error codes specific to the Runs domain
 */
export enum RunErrorCode {
  RUN_EXECUTION_FAILED = 'RUN_EXECUTION_FAILED',
  RUN_INVALID_INPUT = 'RUN_INVALID_INPUT',
  RUN_MAX_ITERATIONS_REACHED = 'RUN_MAX_ITERATIONS_REACHED',
  RUN_TOOL_NOT_FOUND = 'RUN_TOOL_NOT_FOUND',
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

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 409:
        return new ConflictException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
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
