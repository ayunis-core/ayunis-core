import axios, { type AxiosRequestConfig } from "axios";
import config from "../config";

const axiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // With cookie-based auth, no need to manually set Authorization headers
    // The browser will automatically send cookies
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    return Promise.reject(error);
  },
);

// Orval mutator function
export async function customAxiosInstance<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  const response = await axiosInstance(config);
  return response.data;
}

export { axiosInstance };
export default axiosInstance;
