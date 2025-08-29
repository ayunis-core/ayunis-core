/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// Create axios instance for code execution service with all configuration
const codeExecutionAxios = axios.create({
  baseURL: process.env.CODE_EXECUTION_SERVICE_URL || 'http://localhost:8080',
  timeout: 60000, // 60 seconds timeout for code execution
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for any additional logic
codeExecutionAxios.interceptors.request.use(
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
codeExecutionAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Code execution service error:', error.response.data);
    }
    return Promise.reject(
      new Error(error instanceof Error ? error.message : 'Response error'),
    );
  },
);

// Custom instance function for ORVAL that returns just the data
export const codeExecutionAxiosInstance = async <T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const response = await codeExecutionAxios(config);
  return response.data as T;
};

export default codeExecutionAxiosInstance;
