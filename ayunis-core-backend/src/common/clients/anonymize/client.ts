import { PinoLogger } from 'nestjs-pino';
import axios, { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { createPinoLoggerConfig } from '../../logger/pino-logger.config';

const logger = new PinoLogger(createPinoLoggerConfig());
logger.setContext('AnonymizeClient');

interface AnonymizeTimingMetadata {
  requestDurationMs: number;
  queueDurationMs?: number;
  modelLoadDurationMs?: number;
  processingDurationMs?: number;
  coldStart?: boolean;
}

function serverTimingKey(
  name: string,
):
  | keyof Omit<AnonymizeTimingMetadata, 'requestDurationMs' | 'coldStart'>
  | null {
  switch (name) {
    case 'queue':
      return 'queueDurationMs';
    case 'model_load':
      return 'modelLoadDurationMs';
    case 'processing':
      return 'processingDurationMs';
    default:
      return null;
  }
}

export function parseAnonymizeTimingMetadata(
  headers: Record<string, unknown>,
  requestDurationMs: number,
): AnonymizeTimingMetadata {
  const metadata: AnonymizeTimingMetadata = { requestDurationMs };
  const serverTiming = headers['server-timing'];
  if (typeof serverTiming === 'string') {
    for (const entry of serverTiming.split(',')) {
      const match = /^([a-z_]+);dur=([0-9.]+)$/.exec(entry.trim());
      if (!match) continue;
      const key = serverTimingKey(match[1]);
      const value = Number(match[2]);
      if (key && Number.isFinite(value)) metadata[key] = value;
    }
  }
  const coldStart = headers['x-anonymize-cold-start'];
  if (coldStart === 'true' || coldStart === 'false') {
    metadata.coldStart = coldStart === 'true';
  }
  return metadata;
}

const anonymizeAxios = axios.create({
  baseURL: process.env.ANONYMIZE_SERVICE_URL || 'http://localhost:8002',
  // The anonymize service budgets ~30s of analysis work per request (its
  // MAX_TEXT_LENGTH is sized to that) and admits two analyses at a time, so
  // a request queued behind a near-cap one legitimately needs up to ~60s.
  // A client deadline equal to the service's work budget left zero headroom
  // for queue wait and failed messages the service would have completed
  // (AYC-654 incident #457).
  timeout: 60000,
  // Without this flag axios reports its own deadline as ECONNABORTED, which
  // the transport classifier reads as a connection failure; clarified it
  // arrives as ETIMEDOUT and groups under the timeout taxonomy (AYC-654).
  transitional: { clarifyTimeoutError: true },
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * An AxiosError carries the request config — including `data`, the raw
 * pre-anonymization user text — so it must never escape this client: any
 * downstream log or error-metadata sink would persist the very PII this
 * service exists to remove. Rebuild a slim error that keeps only what the
 * transport classifier and the provider taxonomy read: message, code,
 * upstream status, and the low-level cause chain (errno codes, never
 * request bodies). Replacing failures with a bare `new Error(message)`
 * instead would make every anonymize outage unclassifiable (AYC-654).
 */
export function toSlimTransportError(error: unknown): Error {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const slim = new Error(error.message, { cause: error.cause }) as Error & {
    code?: string;
    status?: number;
  };
  slim.code = error.code;
  slim.status = error.response?.status;
  return slim;
}

const requestStartedAt = new WeakMap<object, number>();

anonymizeAxios.interceptors.request.use((config) => {
  requestStartedAt.set(config, performance.now());
  return config;
});

anonymizeAxios.interceptors.response.use(
  (response) => {
    const startedAt = requestStartedAt.get(response.config);
    if (startedAt !== undefined) {
      logger.info(
        parseAnonymizeTimingMetadata(
          response.headers,
          Math.round((performance.now() - startedAt) * 100) / 100,
        ),
        'Anonymize request complete',
      );
    }
    return response;
  },
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 500) {
      const data: unknown = error.response.data;
      logger.error({ response: data }, 'Anonymize service error');
    }
    return Promise.reject(toSlimTransportError(error));
  },
);

// Custom instance function for ORVAL that returns just the data
export const anonymizeAxiosInstance = async <T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const response = await anonymizeAxios(config);
  return response.data as T;
};

export default anonymizeAxiosInstance;
