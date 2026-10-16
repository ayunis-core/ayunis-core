import axios, {
  type AxiosRequestConfig,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import config from '@/shared/config';

const axiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  withCredentials: true,
});

// The proxy answers 502-504 while the single app container restarts during a
// deploy (AYC-1186). Only reads are retried: a failed write may already have
// reached the backend.
const DEPLOY_GAP_STATUSES = new Set([502, 503, 504]);
const RETRYABLE_METHODS = new Set(['get', 'head']);
// ponytail: ~31s outlasts the ~18s app restart measured on staging; raise if that gap grows
const DEPLOY_GAP_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 8000, 8000];

type RetryableConfig = InternalAxiosRequestConfig & {
  deployGapRetries?: number;
};

let deployGapRetriesInFlight = 0;
const deployGapListeners = new Set<() => void>();

function setDeployGapRetriesInFlight(count: number) {
  deployGapRetriesInFlight = count;
  deployGapListeners.forEach((listener) => listener());
}

export function isRetryingThroughDeployGap() {
  return deployGapRetriesInFlight > 0;
}

export function subscribeToDeployGap(listener: () => void) {
  deployGapListeners.add(listener);
  return () => {
    deployGapListeners.delete(listener);
  };
}

async function retryThroughDeployGap(error: AxiosError) {
  const requestConfig = error.config as RetryableConfig | undefined;
  const attempt = requestConfig?.deployGapRetries ?? 0;
  if (
    !requestConfig ||
    !DEPLOY_GAP_STATUSES.has(error.response?.status ?? 0) ||
    !RETRYABLE_METHODS.has(requestConfig.method ?? 'get') ||
    attempt >= DEPLOY_GAP_RETRY_DELAYS_MS.length
  ) {
    return undefined;
  }
  // Later attempts re-enter this interceptor nested inside the first one's
  // await, so only the first attempt counts the request as in flight.
  if (attempt > 0) {
    return retryAfterDelay(requestConfig, attempt);
  }
  setDeployGapRetriesInFlight(deployGapRetriesInFlight + 1);
  try {
    return await retryAfterDelay(requestConfig, attempt);
  } finally {
    setDeployGapRetriesInFlight(deployGapRetriesInFlight - 1);
  }
}

async function retryAfterDelay(
  requestConfig: RetryableConfig,
  attempt: number,
) {
  await new Promise((resolve) =>
    setTimeout(resolve, DEPLOY_GAP_RETRY_DELAYS_MS[attempt]),
  );
  if (requestConfig.signal?.aborted) {
    return undefined;
  }
  const retryConfig: RetryableConfig = {
    ...requestConfig,
    deployGapRetries: attempt + 1,
  };
  return axiosInstance(retryConfig);
}

// Gateway errors have already been retried by the client, so query-level
// retries would only multiply the wait.
export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = (error as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    return false;
  }
  if (status && DEPLOY_GAP_STATUSES.has(status)) {
    return false;
  }
  return failureCount < 3;
}

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // With cookie-based auth, no need to manually set Authorization headers
    // The browser will automatically send cookies
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const retried = await retryThroughDeployGap(error);
    if (retried) {
      return retried;
    }
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  },
);

// Orval mutator function
export async function customAxiosInstance<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  const response = await axiosInstance(config);
  return response.data as T;
}

export { axiosInstance };
export default axiosInstance;
