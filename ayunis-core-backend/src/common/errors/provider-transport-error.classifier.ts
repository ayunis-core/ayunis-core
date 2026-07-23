import { ProviderFailureClass } from './provider.errors';

export interface TransportFailure {
  failureClass: ProviderFailureClass.CONNECTION | ProviderFailureClass.TIMEOUT;
  /** Raw errno / undici / TLS code, when one was found on the chain */
  code?: string;
  /** Best-effort host from the chain (ENOTFOUND carries hostname) */
  host?: string;
}

const CONNECTION_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENETDOWN',
  'UND_ERR_SOCKET',
  'UND_ERR_CLOSED',
  'UND_ERR_DESTROYED',
  'UND_ERR_CONNECT',
  // TLS failures — the provider endpoint is unreachable for us either way.
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_TLS_HANDSHAKE_TIMEOUT',
]);

const TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'ERR_SOCKET_TIMEOUT',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

// SDK wrapper classes that hide the errno. Matched by name so the common
// layer stays free of provider SDK imports. Plain 'AbortError' is
// deliberately absent — client aborts are cancellations, not outages.
const TIMEOUT_NAMES = new Set([
  'APIConnectionTimeoutError', // OpenAI SDK
  'RequestTimeoutError', // Mistral SDK
  'TimeoutError', // AWS SDK / AbortSignal.timeout
]);

const CONNECTION_NAMES = new Set([
  'APIConnectionError', // OpenAI SDK
  'ConnectionError', // Mistral SDK
  'FetchError', // node-fetch
]);

const MAX_CHAIN_NODES = 8;

/**
 * Detects transport-level failures (connection or timeout) anywhere on an
 * error's cause chain. Undici wraps coded errors in `TypeError: fetch failed`
 * with the errno on `.cause` (or inside an AggregateError for multi-address
 * connects), so classification walks the whole chain. Codes are checked
 * before wrapper names because they are the more specific signal — e.g. a
 * Mistral ConnectionError caused by UND_ERR_BODY_TIMEOUT is a timeout.
 */
export function classifyTransportError(
  error: unknown,
): TransportFailure | undefined {
  const chain = collectChain(error);
  const match = classifyByCode(chain) ?? classifyByName(chain);
  if (!match) return undefined;
  return { ...match, host: findHost(chain) };
}

function collectChain(root: unknown): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  const queue: unknown[] = [root];
  const seen = new Set<unknown>();
  while (queue.length > 0 && chain.length < MAX_CHAIN_NODES) {
    const node = queue.shift();
    if (typeof node !== 'object' || node === null || seen.has(node)) continue;
    seen.add(node);
    const record = node as Record<string, unknown>;
    chain.push(record);
    if (record.cause !== undefined) queue.push(record.cause);
    if (Array.isArray(record.errors)) {
      queue.push(...(record.errors as unknown[]));
    }
  }
  return chain;
}

function classifyByCode(
  chain: Record<string, unknown>[],
): Omit<TransportFailure, 'host'> | undefined {
  for (const node of chain) {
    const code = typeof node.code === 'string' ? node.code : undefined;
    if (!code) continue;
    if (TIMEOUT_CODES.has(code)) {
      return { failureClass: ProviderFailureClass.TIMEOUT, code };
    }
    if (CONNECTION_CODES.has(code)) {
      return { failureClass: ProviderFailureClass.CONNECTION, code };
    }
  }
  return undefined;
}

function classifyByName(
  chain: Record<string, unknown>[],
): Omit<TransportFailure, 'host'> | undefined {
  for (const node of chain) {
    const name = typeof node.name === 'string' ? node.name : undefined;
    if (!name) continue;
    if (TIMEOUT_NAMES.has(name)) {
      return { failureClass: ProviderFailureClass.TIMEOUT };
    }
    if (CONNECTION_NAMES.has(name)) {
      return { failureClass: ProviderFailureClass.CONNECTION };
    }
  }
  return undefined;
}

function findHost(chain: Record<string, unknown>[]): string | undefined {
  for (const node of chain) {
    if (typeof node.hostname === 'string') return node.hostname;
    if (typeof node.address === 'string') return node.address;
  }
  return undefined;
}
