import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum ToolErrorCode {
  HANDLER_NOT_FOUND = 'HANDLER_NOT_FOUND',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_CONTEXT = 'INVALID_CONTEXT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
}

export class ToolError extends ApplicationError {
  constructor(params: {
    message: string;
    code: ToolErrorCode;
    metadata?: ErrorMetadata;
  }) {
    super(params.message, params.code, 500, params.metadata);
    this.name = 'ToolError';
  }
}

export class ToolNotFoundError extends ToolError {
  constructor(params: { toolName: string; metadata?: ErrorMetadata }) {
    super({
      message: `Tool '${params.toolName}' not found`,
      code: ToolErrorCode.NOT_FOUND,
      metadata: params.metadata,
    });
    this.name = 'ToolNotFoundError';
  }
}

export class ToolHandlerNotFoundError extends ToolError {
  constructor(params: { toolType: string; metadata?: ErrorMetadata }) {
    super({
      message: `Tool handler not found for tool type: ${params.toolType}`,
      code: ToolErrorCode.HANDLER_NOT_FOUND,
      metadata: params.metadata,
    });
    this.name = 'ToolHandlerNotFoundError';
  }
}

export class ToolInvalidTypeError extends ToolError {
  constructor(params: { toolType: string; metadata?: ErrorMetadata }) {
    super({
      message: `Invalid tool type: ${params.toolType}`,
      code: ToolErrorCode.INVALID_TYPE,
      metadata: params.metadata,
    });
    this.name = 'ToolInvalidTypeError';
  }
}

export class ToolInvalidConfigError extends ToolError {
  constructor(params: { toolName: string; metadata?: ErrorMetadata }) {
    super({
      message: `Invalid config for tool: ${params.toolName}`,
      code: ToolErrorCode.INVALID_CONFIG,
      metadata: params.metadata,
    });
    this.name = 'ToolInvalidConfigError';
  }
}

export class ToolInvalidContextError extends ToolError {
  constructor(params: { toolType: string; metadata?: ErrorMetadata }) {
    super({
      message: `Invalid context for tool: ${params.toolType}`,
      code: ToolErrorCode.INVALID_CONTEXT,
      metadata: params.metadata,
    });
  }
}

export class ToolExecutionFailedError extends ToolError {
  public readonly exposeToLLM: boolean;
  constructor(params: {
    toolName: string;
    exposeToLLM: boolean;
    message: string;
    metadata?: ErrorMetadata;
  }) {
    super({
      message: `Failed to execute tool ${params.toolName}: ${params.message}`,
      code: ToolErrorCode.EXECUTION_FAILED,
      metadata: params.metadata,
    });
    this.name = 'ToolExecutionFailedError';
    this.exposeToLLM = params.exposeToLLM;
  }
}

export class ToolInvalidInputError extends ToolError {
  constructor(params: { toolName: string; metadata?: ErrorMetadata }) {
    super({
      message: `Invalid input for tool: ${params.toolName}`,
      code: ToolErrorCode.INVALID_INPUT,
      metadata: params.metadata,
    });
    this.name = 'ToolInvalidInputError';
  }
}
