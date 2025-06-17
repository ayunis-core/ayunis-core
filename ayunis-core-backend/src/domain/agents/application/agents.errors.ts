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
 * Error codes specific to the Agents domain
 */
export enum AgentErrorCode {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_INVALID_INPUT = 'AGENT_INVALID_INPUT',
  AGENT_EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
}

/**
 * Base agent error that all agent-specific errors should extend
 */
export abstract class AgentError extends ApplicationError {
  constructor(
    message: string,
    code: AgentErrorCode,
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
 * Error thrown when an agent is not found
 */
export class AgentNotFoundError extends AgentError {
  constructor(agentId: string, metadata?: ErrorMetadata) {
    super(
      `Agent with ID ${agentId} not found`,
      AgentErrorCode.AGENT_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when agent input is invalid
 */
export class AgentInvalidInputError extends AgentError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid agent input: ${reason}`,
      AgentErrorCode.AGENT_INVALID_INPUT,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when agent execution fails
 */
export class AgentExecutionFailedError extends AgentError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Agent execution failed: ${reason}`,
      AgentErrorCode.AGENT_EXECUTION_FAILED,
      500,
      metadata,
    );
  }
}
