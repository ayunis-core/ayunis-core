import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Error codes specific to the Agents domain
 */
export enum AgentErrorCode {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_INVALID_INPUT = 'AGENT_INVALID_INPUT',
  AGENT_EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
  AGENT_TOOL_ASSIGNMENT_NOT_FOUND = 'AGENT_TOOL_ASSIGNMENT_NOT_FOUND',
  UNEXPECTED_AGENT_ERROR = 'UNEXPECTED_AGENT_ERROR',
  SOURCE_ALREADY_ASSIGNED = 'SOURCE_ALREADY_ASSIGNED',
  MCP_INTEGRATION_NOT_FOUND = 'MCP_INTEGRATION_NOT_FOUND',
  MCP_INTEGRATION_ALREADY_ASSIGNED = 'MCP_INTEGRATION_ALREADY_ASSIGNED',
  MCP_INTEGRATION_DISABLED = 'MCP_INTEGRATION_DISABLED',
  MCP_INTEGRATION_WRONG_ORGANIZATION = 'MCP_INTEGRATION_WRONG_ORGANIZATION',
  MCP_INTEGRATION_NOT_ASSIGNED = 'MCP_INTEGRATION_NOT_ASSIGNED',
  MISSING_FILE = 'MISSING_FILE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  EMPTY_FILE_DATA = 'EMPTY_FILE_DATA',
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
      case 403:
        return new ForbiddenException({
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

/**
 * Error thrown when an agent tool assignment is not found
 */
export class AgentToolAssignmentNotFoundError extends AgentError {
  constructor(toolAssignmentId: string, metadata?: ErrorMetadata) {
    super(
      `Agent tool assignment with ID ${toolAssignmentId} not found`,
      AgentErrorCode.AGENT_TOOL_ASSIGNMENT_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when a source is already assigned to an agent
 */
export class SourceAlreadyAssignedError extends AgentError {
  constructor(sourceId: string, metadata?: ErrorMetadata) {
    super(
      `Source with ID ${sourceId} is already assigned to an agent`,
      AgentErrorCode.SOURCE_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when an unexpected error occurs
 */
export class UnexpectedAgentError extends AgentError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      AgentErrorCode.UNEXPECTED_AGENT_ERROR,
      500,
      { error },
    );
  }
}

/**
 * Error thrown when an MCP integration is not found
 */
export class McpIntegrationNotFoundError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} not found`,
      AgentErrorCode.MCP_INTEGRATION_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when an MCP integration is already assigned to an agent
 */
export class McpIntegrationAlreadyAssignedError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is already assigned to this agent`,
      AgentErrorCode.MCP_INTEGRATION_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when an MCP integration is disabled
 */
export class McpIntegrationDisabledError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is disabled`,
      AgentErrorCode.MCP_INTEGRATION_DISABLED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an MCP integration belongs to a different organization
 */
export class McpIntegrationWrongOrganizationError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} does not belong to your organization`,
      AgentErrorCode.MCP_INTEGRATION_WRONG_ORGANIZATION,
      403,
      metadata,
    );
  }
}

/**
 * Error thrown when an MCP integration is not assigned to an agent
 */
export class McpIntegrationNotAssignedError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is not assigned to this agent`,
      AgentErrorCode.MCP_INTEGRATION_NOT_ASSIGNED,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when an unsupported file type is uploaded to an agent
 */
export class MissingFileError extends AgentError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'No file was provided in the request',
      AgentErrorCode.MISSING_FILE,
      400,
      metadata,
    );
  }
}

export class UnsupportedFileTypeError extends AgentError {
  constructor(
    fileType: string,
    supportedTypes: string[],
    metadata?: ErrorMetadata,
  ) {
    super(
      `File type '${fileType}' is not supported. Supported types: ${supportedTypes.join(', ')}`,
      AgentErrorCode.UNSUPPORTED_FILE_TYPE,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an uploaded file contains no processable data
 */
export class EmptyFileDataError extends AgentError {
  constructor(fileName: string, metadata?: ErrorMetadata) {
    super(
      `The file '${fileName}' contains no processable data`,
      AgentErrorCode.EMPTY_FILE_DATA,
      400,
      {
        fileName,
        ...metadata,
      },
    );
  }
}
