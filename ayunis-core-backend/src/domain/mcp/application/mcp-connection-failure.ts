import { McpRuntimeConnectionError } from './mcp-runtime-connection.error';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import { ProviderFailureClass } from 'src/common/errors/provider.errors';
import type { McpVerificationFailure } from './mcp-credential-verification.error';

interface FailureShape {
  status?: unknown;
  code?: unknown;
  name?: string;
  cause?: unknown;
  data?: { cause?: unknown };
}
const REJECTED = new Set([
  'MCP_AUTHENTICATION_FAILED',
  'MCP_USER_AUTHORIZATION_REQUIRED',
  'MCP_CREDENTIALS_REJECTED',
]);
const TIMEOUT = new Set<unknown>([
  'REQUEST_TIMEOUT',
  -32001,
  20,
  'MCP_CONNECTION_TIMEOUT',
]);
const UNAVAILABLE = new Set<unknown>([
  'MCP_CONNECTION_FAILED',
  'MCP_OAUTH_SERVER_UNREACHABLE',
]);

const INVALID_RESPONSE = new Set<unknown>([
  'MCP_OAUTH_INVALID_RESPONSE',
  'CLIENT_HTTP_UNEXPECTED_CONTENT',
]);

export function mcpConnectionFailure(
  error: unknown,
  depth = 0,
): McpVerificationFailure | undefined {
  if (error instanceof McpRuntimeConnectionError) return error.reason;
  if (depth >= 4 || !isFailureShape(error)) return undefined;
  const shape = error;
  if (shape.code === 'MCP_TOOL_TIMEOUT') return undefined;
  return (
    statusFailure(shape) ??
    transportFailure(error, shape) ??
    mcpConnectionFailure(shape.cause ?? shape.data?.cause, depth + 1)
  );
}

function isFailureShape(error: unknown): error is FailureShape {
  return typeof error === 'object' && error !== null;
}

function statusFailure(
  error: FailureShape,
): McpVerificationFailure | undefined {
  const status = error.status ?? error.code;
  if (
    status === 401 ||
    error.name === 'UnauthorizedError' ||
    REJECTED.has(String(error.code))
  )
    return 'rejected';
  if (status === 403 || error.name === 'InsufficientScopeError')
    return 'forbidden';
  if (typeof status === 'number' && status >= 500) return 'unavailable';
  return undefined;
}

function transportFailure(
  error: object,
  shape: FailureShape,
): McpVerificationFailure | undefined {
  if (shape.name === 'AbortError' || TIMEOUT.has(shape.code)) return 'timeout';
  const transport = classifyTransportError(error);
  if (transport?.failureClass === ProviderFailureClass.TIMEOUT)
    return 'timeout';
  if (transport || UNAVAILABLE.has(shape.code)) return 'unavailable';
  if (error instanceof SyntaxError || INVALID_RESPONSE.has(shape.code))
    return 'invalidResponse';
  return undefined;
}
