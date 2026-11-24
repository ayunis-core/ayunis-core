import {
  Client,
  type ClientOptions,
  type Transport,
} from '@modelcontextprotocol/client';

const CLIENT_INFO = { name: 'ayunis-core', version: '1.0.0' };

export const NEGOTIATION_PROBE_TIMEOUT_MS = 3000;

// The SDK reports a probe timeout with the same REQUEST_TIMEOUT code as any
// other request timeout; only the message identifies the probe.
const PROBE_TIMEOUT_MESSAGE = 'Version negotiation probe timed out';

export interface ConnectMcpClientParams {
  createTransport: () => Transport;
  timeout: number;
  onLegacyFallback: () => void;
  probeTimeoutMs?: number;
}

/**
 * Over HTTP the SDK treats an unanswered `server/discover` probe as an outage,
 * but some 2025-era servers accept it with HTTP 202 and never reply while a
 * plain `initialize` works. Those get a fresh legacy connection within the
 * remaining budget; every other failure is final.
 */
export async function connectMcpClient(
  params: ConnectMcpClientParams,
): Promise<Client> {
  const probeTimeoutMs = params.probeTimeoutMs ?? NEGOTIATION_PROBE_TIMEOUT_MS;
  try {
    return await connect(
      params,
      { mode: 'auto', probe: { timeoutMs: probeTimeoutMs } },
      params.timeout,
    );
  } catch (error) {
    if (!isProbeTimeout(error)) throw error;
  }
  params.onLegacyFallback();
  return connect(params, { mode: 'legacy' }, params.timeout - probeTimeoutMs);
}

async function connect(
  params: ConnectMcpClientParams,
  versionNegotiation: NonNullable<ClientOptions['versionNegotiation']>,
  timeout: number,
): Promise<Client> {
  const client = new Client(CLIENT_INFO, { versionNegotiation });
  try {
    await client.connect(params.createTransport(), { timeout });
    return client;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}

function isProbeTimeout(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'REQUEST_TIMEOUT' &&
    typeof message === 'string' &&
    message.startsWith(PROBE_TIMEOUT_MESSAGE)
  );
}
