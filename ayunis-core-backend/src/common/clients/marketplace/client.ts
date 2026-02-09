import axios from 'axios';
import type { AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Custom error class that preserves HTTP status information from Axios errors.
 * This enables downstream code to distinguish between "not found" (404) and
 * "service unavailable" (5xx, network errors, timeouts, etc.).
 */
export class MarketplaceHttpError extends Error {
  readonly status: number | undefined;
  readonly isNetworkError: boolean;

  constructor(message: string, status?: number, isNetworkError = false) {
    super(message);
    this.name = 'MarketplaceHttpError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }

  static fromAxiosError(error: AxiosError): MarketplaceHttpError {
    const status = error.response?.status;
    const isNetworkError = !error.response && !!error.request;
    const message = error.message || 'Marketplace request failed';
    return new MarketplaceHttpError(message, status, isNetworkError);
  }
}

// Create axios instance for marketplace service with all configuration
const marketplaceAxios = axios.create({
  baseURL: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3002',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for any additional logic
marketplaceAxios.interceptors.request.use(
  (config) => {
    // Add any authentication headers if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(
      new MarketplaceHttpError(
        error instanceof Error ? error.message : 'Request error',
      ),
    );
  },
);

// Response interceptor for error handling
marketplaceAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Marketplace service error:', error.response.data);
    }
    return Promise.reject(MarketplaceHttpError.fromAxiosError(error));
  },
);

// Custom instance function for ORVAL that returns just the data
export const marketplaceAxiosInstance = async <T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const response = await marketplaceAxios(config);
  return response.data as T;
};

export default marketplaceAxiosInstance;
