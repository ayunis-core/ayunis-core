import { randomInt } from 'crypto';
import { resolve4 } from 'dns/promises';
import { isIP } from 'net';
import axios from 'axios';

/**
 * Runs `send` against one Gotenberg replica after another until one accepts
 * the request. A replica started with --libreoffice-max-queue-size=1 answers
 * 429 at once while it converts another document, and Node's keep-alive would
 * send a plain retry down the same connection to that same replica, so each
 * replica is addressed by its own IP instead (AYC-1741). Rethrows the last 429
 * when every replica is occupied.
 */
export async function sendToFreeReplica<T>(
  serviceUrl: string,
  send: (replicaUrl: string) => Promise<T>,
): Promise<T> {
  let occupied: unknown;
  for (const replicaUrl of await resolveReplicaUrls(serviceUrl)) {
    try {
      return await send(replicaUrl);
    } catch (error) {
      if (!isQueueFull(error)) throw error;
      occupied = error;
    }
  }
  throw occupied;
}

/**
 * Docker publishes one A record per replica under the service name. A host
 * without such records (an IP, localhost, a TLS endpoint whose certificate
 * names the host) is used as configured.
 */
async function resolveReplicaUrls(serviceUrl: string): Promise<string[]> {
  const { protocol, hostname } = new URL(serviceUrl);
  if (protocol !== 'http:' || isIP(hostname) !== 0) return [serviceUrl];

  const addresses = await resolve4(hostname).catch(() => []);
  if (addresses.length === 0) return [serviceUrl];

  return shuffled(addresses).map((address) => {
    const replica = new URL(serviceUrl);
    replica.hostname = address;
    return replica.toString().replace(/\/$/, '');
  });
}

function isQueueFull(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 429;
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
