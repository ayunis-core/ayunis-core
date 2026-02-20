/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// Create axios instance for anonymize service with all configuration
const anonymizeAxios = axios.create({
  baseURL: process.env.ANONYMIZE_SERVICE_URL || 'http://localhost:8002',
  timeout: 30000, // 30 seconds timeout for text analysis
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for any additional logic
anonymizeAxios.interceptors.request.use(
  (config) => {
    // Add any authentication headers if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(
      new Error(error instanceof Error ? error.message : 'Request error'),
    );
  },
);

// Response interceptor for error handling
anonymizeAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Anonymize service error:', error.response.data);
    }
    return Promise.reject(
      new Error(error instanceof Error ? error.message : 'Response error'),
    );
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
