import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

export enum ToolErrorCode {
  HANDLER_NOT_FOUND = 'HANDLER_NOT_FOUND',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
}

export class ToolError extends ApplicationError {
  constructor(params: { message: string; metadata?: ErrorMetadata }) {
    super(params.message, ToolErrorCode.EXECUTION_FAILED, 500, params.metadata);
    this.name = 'ToolError';
  }
}

export class ToolNotFoundError extends ToolError {
  constructor(params: { toolName: string; metadata?: ErrorMetadata }) {
    super({
      message: `Tool '${params.toolName}' not found`,
      metadata: params.metadata,
    });
    this.name = 'ToolNotFoundError';
  }
}

export class ToolHandlerNotFoundError extends ToolError {
  constructor(params: { toolType: string; metadata?: ErrorMetadata }) {
    super({
      message: `Tool handler not found for tool type: ${params.toolType}`,
      metadata: params.metadata,
    });
    this.name = 'ToolHandlerNotFoundError';
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
      metadata: params.metadata,
    });
    this.name = 'ToolInvalidInputError';
  }
}
