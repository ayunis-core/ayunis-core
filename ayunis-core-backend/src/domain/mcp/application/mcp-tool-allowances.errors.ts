import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum McpToolAllowanceErrorCode {
  MCP_TOOL_ALLOWANCE_NOT_FOUND = 'MCP_TOOL_ALLOWANCE_NOT_FOUND',
}

export class McpToolAllowanceNotFoundError extends ApplicationError {
  constructor(allowanceId: string, metadata?: ErrorMetadata) {
    super(
      `Always-allowed MCP tool ${allowanceId} not found`,
      McpToolAllowanceErrorCode.MCP_TOOL_ALLOWANCE_NOT_FOUND,
      404,
      metadata,
    );
  }
}
