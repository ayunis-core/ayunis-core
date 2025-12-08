/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// Create axios instance for Docling service with all configuration
const doclingAxios = axios.create({
  baseURL: process.env.DOCLING_SERVICE_URL || 'http://localhost:5001',
  timeout: 120000, // 120 seconds timeout for document processing (can be slow for large PDFs)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
doclingAxios.interceptors.request.use(
  (config) => {
    // Add API key header if configured
    const apiKey = process.env.DOCLING_API_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(
      new Error(error instanceof Error ? error.message : 'Request error'),
    );
  },
);

// Response interceptor for error handling
doclingAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Docling service error:', error.response.data);
    }
    return Promise.reject(
      new Error(error instanceof Error ? error.message : 'Response error'),
    );
  },
);

// Custom instance function for ORVAL that returns just the data
export const doclingAxiosInstance = async <T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const response = await doclingAxios(config);
  return response.data as T;
};

export default doclingAxiosInstance;
