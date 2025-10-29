import { ApplicationError, ErrorMetadata } from 'src/common/errors/base.error';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export enum McpErrorCode {
  INVALID_PREDEFINED_SLUG = 'INVALID_PREDEFINED_SLUG',
  INVALID_SERVER_URL = 'INVALID_SERVER_URL',
  MCP_INTEGRATION_NOT_FOUND = 'MCP_INTEGRATION_NOT_FOUND',
  MCP_INTEGRATION_ACCESS_DENIED = 'MCP_INTEGRATION_ACCESS_DENIED',
  MCP_INTEGRATION_DISABLED = 'MCP_INTEGRATION_DISABLED',
  MCP_CONNECTION_TIMEOUT = 'MCP_CONNECTION_TIMEOUT',
  MCP_AUTHENTICATION_FAILED = 'MCP_AUTHENTICATION_FAILED',
  MCP_VALIDATION_FAILED = 'MCP_VALIDATION_FAILED',
  MCP_TOOL_EXECUTION_FAILED = 'MCP_TOOL_EXECUTION_FAILED',
  MCP_RESOURCE_RETRIEVAL_FAILED = 'MCP_RESOURCE_RETRIEVAL_FAILED',
  UNEXPECTED_MCP_ERROR = 'UNEXPECTED_MCP_ERROR',
}

export abstract class McpError extends ApplicationError {
  constructor(
    message: string,
    code: McpErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

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
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

export class InvalidPredefinedSlugError extends McpError {
  constructor(slug: string, metadata?: ErrorMetadata) {
    super(
      `Invalid predefined integration slug: ${slug}`,
      McpErrorCode.INVALID_PREDEFINED_SLUG,
      400,
      metadata,
    );
  }
}

export class McpIntegrationNotFoundError extends McpError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} not found. It may have been deleted or you may not have access to it.`,
      McpErrorCode.MCP_INTEGRATION_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class McpIntegrationAccessDeniedError extends McpError {
  constructor(
    integrationId: string,
    integrationName?: string,
    metadata?: ErrorMetadata,
  ) {
    const name = integrationName ? ` '${integrationName}'` : '';
    super(
      `Access denied to MCP integration${name} (ID: ${integrationId}). This integration belongs to a different organization.`,
      McpErrorCode.MCP_INTEGRATION_ACCESS_DENIED,
      403,
      metadata,
    );
  }
}

export class UnexpectedMcpError extends McpError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, McpErrorCode.UNEXPECTED_MCP_ERROR, 500, metadata);
  }
}

export class InvalidServerUrlError extends McpError {
  constructor(serverUrl: string, metadata?: ErrorMetadata) {
    super(
      `Invalid server URL: ${serverUrl}`,
      McpErrorCode.INVALID_SERVER_URL,
      400,
      metadata,
    );
  }
}

export class McpIntegrationDisabledError extends McpError {
  constructor(
    integrationId: string,
    integrationName?: string,
    metadata?: ErrorMetadata,
  ) {
    const name = integrationName ? ` '${integrationName}'` : '';
    super(
      `MCP integration${name} (ID: ${integrationId}) is disabled. Please enable it before use.`,
      McpErrorCode.MCP_INTEGRATION_DISABLED,
      403,
      metadata,
    );
  }
}

export class McpConnectionTimeoutError extends McpError {
  constructor(
    integrationId: string,
    integrationName: string,
    serverUrl: string,
    metadata?: ErrorMetadata,
  ) {
    // Redact credentials from URL for logging
    const redactedUrl = serverUrl.replace(/\/\/[^@]+@/, '//***@');
    super(
      `Connection to MCP integration '${integrationName}' (ID: ${integrationId}) timed out. ` +
        `Please verify the server at ${redactedUrl} is running and accessible. ` +
        `Check network connectivity and server status.`,
      McpErrorCode.MCP_CONNECTION_TIMEOUT,
      504,
      metadata,
    );
  }
}

export class McpAuthenticationFailedError extends McpError {
  constructor(
    integrationId: string,
    integrationName: string,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Authentication failed for MCP integration '${integrationName}' (ID: ${integrationId}). ` +
        `Please verify your API key or Bearer token is correct and has not expired. ` +
        `Check the integration's authentication configuration.`,
      McpErrorCode.MCP_AUTHENTICATION_FAILED,
      401,
      metadata,
    );
  }
}

export class McpValidationFailedError extends McpError {
  constructor(
    integrationId: string,
    integrationName: string,
    reason: string,
    field?: string,
    metadata?: ErrorMetadata,
  ) {
    const fieldMsg = field ? ` Field '${field}' is invalid.` : '';
    super(
      `Validation failed for MCP integration '${integrationName}' (ID: ${integrationId}). ` +
        `${reason}${fieldMsg} Please check the configuration and try again.`,
      McpErrorCode.MCP_VALIDATION_FAILED,
      400,
      metadata,
    );
  }
}

export class McpToolExecutionFailedError extends McpError {
  constructor(
    integrationId: string,
    integrationName: string,
    toolName: string,
    reason: string,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Tool execution failed for '${toolName}' in MCP integration '${integrationName}' (ID: ${integrationId}). ` +
        `Reason: ${reason}. Check tool parameters and server logs for details.`,
      McpErrorCode.MCP_TOOL_EXECUTION_FAILED,
      500,
      metadata,
    );
  }
}

export class McpResourceRetrievalFailedError extends McpError {
  constructor(
    integrationId: string,
    integrationName: string,
    resourceUri: string,
    reason: string,
    metadata?: ErrorMetadata,
  ) {
    super(
      `Resource retrieval failed for '${resourceUri}' in MCP integration '${integrationName}' (ID: ${integrationId}). ` +
        `Reason: ${reason}. Verify the resource URI and server availability.`,
      McpErrorCode.MCP_RESOURCE_RETRIEVAL_FAILED,
      500,
      metadata,
    );
  }
}
