export const paneApiBaseUrl = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL ?? '/api');
