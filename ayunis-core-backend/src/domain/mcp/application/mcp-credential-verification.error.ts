import { McpError, McpErrorCode } from './mcp.errors';

export type McpVerificationFailure =
  'rejected' | 'forbidden' | 'timeout' | 'unavailable' | 'invalidResponse';

const FAILURES = {
  rejected: [
    McpErrorCode.MCP_CREDENTIALS_REJECTED,
    422,
    'The MCP server rejected these credentials.',
  ],
  forbidden: [
    McpErrorCode.MCP_CREDENTIALS_FORBIDDEN,
    422,
    'These credentials do not have the required access.',
  ],
  timeout: [
    McpErrorCode.MCP_VERIFICATION_TIMEOUT,
    504,
    'The MCP server did not respond in time. Try again.',
  ],
  unavailable: [
    McpErrorCode.MCP_VERIFICATION_UNAVAILABLE,
    502,
    'The MCP server could not be reached. Try again.',
  ],
  invalidResponse: [
    McpErrorCode.MCP_VERIFICATION_INVALID_RESPONSE,
    422,
    'The server did not return a compatible MCP response.',
  ],
} as const;

export class McpCredentialVerificationError extends McpError {
  constructor(reason: McpVerificationFailure) {
    const [code, status, message] = FAILURES[reason];
    super(message, code, status);
  }
}

export class McpConfigChangedError extends McpError {
  constructor() {
    super(
      'The integration or your credentials changed during verification. Reload and try again.',
      McpErrorCode.MCP_CONFIG_CHANGED,
      409,
    );
  }
}
