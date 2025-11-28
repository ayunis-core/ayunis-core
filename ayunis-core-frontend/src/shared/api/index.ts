// Re-export all generated API functions and types
export * from './generated/ayunisCoreAPI';
export * from './generated/ayunisCoreAPI.schemas';

// Re-export the axios instance and SSE functions for direct use if needed
export { axiosInstance, customAxiosInstance } from './client';
