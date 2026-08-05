import { Logger } from '@nestjs/common';
import axios, { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';

const logger = new Logger('AnonymizeClient');

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

anonymizeAxios.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 500) {
      const data: unknown = error.response.data;
      logger.error('Anonymize service error', { data });
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
