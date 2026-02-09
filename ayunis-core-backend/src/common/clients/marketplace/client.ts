/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

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
      new Error(error instanceof Error ? error.message : 'Request error'),
    );
  },
);

// Response interceptor for error handling
marketplaceAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Marketplace service error:', error.response.data);
    }
    return Promise.reject(
      new Error(error instanceof Error ? error.message : 'Response error'),
    );
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
