import { Client, type Transport } from '@modelcontextprotocol/client';

const CLIENT_INFO = { name: 'ayunis-core', version: '1.0.0' };

/**
 * Every new connection to a server that swallows the probe waits this long
 * before the legacy handshake starts, so it stays well below the
 * capability-discovery budget.
 */
export const DEFAULT_PROBE_TIMEOUT_MS = 3000;

// The SDK reports a probe timeout with the same REQUEST_TIMEOUT code as a
// timed-out initialize; only the message tells them apart.
const PROBE_TIMEOUT_MESSAGE_PREFIX = 'Version negotiation probe timed out';

export interface ConnectMcpClientParams {
  createTransport: () => Transport;
  requestOptions: { timeout: number };
  probeTimeoutMs?: number;
  onLegacyFallback?: (error: unknown) => void;
}

/**
 * The SDK only falls back to the pre-2026-07-28 handshake when a server
 * answers the `server/discover` probe with a JSON-RPC error. Servers that
 * accept the probe without replying, or reply with something that is not
 * JSON-RPC, fail the negotiation although `initialize` would succeed.
 * Authorization failures carry their own codes and are not retried.
 */
function isNegotiationFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === 'ERA_NEGOTIATION_FAILED') return true;
  return (
    code === 'REQUEST_TIMEOUT' &&
    typeof message === 'string' &&
    message.startsWith(PROBE_TIMEOUT_MESSAGE_PREFIX)
  );
}

export async function connectMcpClient(
  params: ConnectMcpClientParams,
): Promise<Client> {
  const probeTimeoutMs = Math.min(
    params.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS,
    params.requestOptions.timeout,
  );
  const negotiating = new Client(CLIENT_INFO, {
    versionNegotiation: { mode: 'auto', probe: { timeoutMs: probeTimeoutMs } },
  });
  try {
    await negotiating.connect(params.createTransport(), params.requestOptions);
    return negotiating;
  } catch (error) {
    await negotiating.close().catch(() => undefined);
    if (!isNegotiationFailure(error)) throw error;
    params.onLegacyFallback?.(error);
  }

  const legacy = new Client(CLIENT_INFO);
  try {
    await legacy.connect(params.createTransport(), params.requestOptions);
    return legacy;
  } catch (error) {
    await legacy.close().catch(() => undefined);
    throw error;
  }
}
