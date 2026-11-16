import type { Client } from '@modelcontextprotocol/client';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import { ProviderFailureClass } from 'src/common/errors/provider.errors';
import {
  McpCredentialVerificationError,
  type McpVerificationFailure,
} from 'src/domain/mcp/application/mcp-credential-verification.error';

export async function verifyMcpCredentials(
  createClient: () => Promise<Client>,
): Promise<void> {
  let client: Client | undefined;
  try {
    client = await createClient();
    const capabilities = client.getServerCapabilities();
    const options = { timeout: 10_000 };
    if (capabilities?.tools) await client.listTools(undefined, options);
    if (capabilities?.resources)
      await optionalDiscovery(client.listResources(undefined, options));
    if (capabilities?.prompts)
      await optionalDiscovery(client.listPrompts(undefined, options));
  } catch (error) {
    // Provider messages and causes can contain submitted secrets.
    throw new McpCredentialVerificationError(
      classifyVerificationFailure(error),
    );
  } finally {
    await client?.close().catch(() => undefined);
  }
}

function classifyVerificationFailure(error: unknown): McpVerificationFailure {
  const transport = classifyTransportError(error);
  const reason = inspectCause(error);
  if (reason) return reason;
  if (transport?.failureClass === ProviderFailureClass.TIMEOUT)
    return 'timeout';
  if (transport) return 'unavailable';
  return 'invalidResponse';
}

function inspectCause(
  error: unknown,
  depth = 0,
): McpVerificationFailure | undefined {
  if (depth === 4 || typeof error !== 'object' || error === null)
    return undefined;
  const e = error as {
    status?: number;
    code?: unknown;
    name?: string;
    cause?: unknown;
    data?: { cause?: unknown };
  };
  const reason = classifyStatus(e.status ?? e.code, e.name);
  if (reason) return reason;
  if (isTimeout(e.name, e.code)) return 'timeout';
  return inspectCause(e.cause ?? e.data?.cause, depth + 1);
}

function classifyStatus(
  status: unknown,
  name?: string,
): McpVerificationFailure | undefined {
  if (status === 401 || name === 'UnauthorizedError') return 'rejected';
  if (status === 403 || name === 'InsufficientScopeError') return 'forbidden';
  if (typeof status === 'number' && status >= 500) return 'unavailable';
  return undefined;
}

function isTimeout(name: string | undefined, code: unknown): boolean {
  return (
    name === 'AbortError' ||
    ['REQUEST_TIMEOUT', -32001, 20].includes(code as string | number)
  );
}

async function optionalDiscovery(request: Promise<unknown>): Promise<void> {
  try {
    await request;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === -32601
    )
      return;
    throw error;
  }
}
