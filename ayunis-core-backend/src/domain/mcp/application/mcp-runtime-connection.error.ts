import { McpError, McpErrorCode } from './mcp.errors';
import type { McpVerificationFailure } from './mcp-credential-verification.error';

const OUTAGE_STATUS: Partial<Record<McpVerificationFailure, number>> = {
  timeout: 504,
  unavailable: 503,
  invalidResponse: 502,
};

export const MCP_CONNECTION_UNAVAILABLE_MESSAGE =
  'The MCP integration is unavailable. Check its connection settings or ask your administrator for help.';

export class McpRuntimeConnectionError extends McpError {
  constructor(public readonly reason: McpVerificationFailure) {
    super(
      MCP_CONNECTION_UNAVAILABLE_MESSAGE,
      McpErrorCode.MCP_RUNTIME_CONNECTION_FAILED,
      OUTAGE_STATUS[reason] ?? 422,
      { reason },
    );
  }
}
