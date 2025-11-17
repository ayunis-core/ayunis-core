import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';
import config from '../config';

const axiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  withCredentials: true,
});

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
  (error: AxiosError) => {
    // Handle common errors here
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
