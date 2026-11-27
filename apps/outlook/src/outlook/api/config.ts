import { SessionHandoffRequestDtoClient } from '@ayunis/api-client/schemas';

export const paneApiBaseUrl = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL ?? '/api');

export const OUTLOOK_CLIENT = SessionHandoffRequestDtoClient.outlook;
export const OUTLOOK_LOGIN_PATH = '/outlook/login';
export const OUTLOOK_REFRESH_TOKEN_KEY = 'ayunis.outlook.refreshToken';
