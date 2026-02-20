import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

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
  THREAD_AGENT_NO_LONGER_ACCESSIBLE = 'THREAD_AGENT_NO_LONGER_ACCESSIBLE',
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
 * Error thrown when the agent used in a thread is no longer accessible
 * (e.g., agent was deleted, share was removed, user was removed from team)
 */
export class ThreadAgentNoLongerAccessibleError extends RunError {
  constructor(threadId: string, agentId: string, metadata?: ErrorMetadata) {
    super(
      `The agent used in this conversation is no longer accessible. The agent may have been deleted or you no longer have access to it.`,
      RunErrorCode.THREAD_AGENT_NO_LONGER_ACCESSIBLE,
      403,
      { threadId, agentId, ...metadata },
    );
  }
}
