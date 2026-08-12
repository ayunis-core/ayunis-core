import { runtimeEnv } from './runtime-env';

// Simple configuration for Vite environment. Environment-specific values come
// from the backend at runtime via runtimeEnv (see runtime-env.ts) so the
// built bundle stays host-agnostic.
const config = {
  env: import.meta.env.MODE as 'development' | 'production' | 'test',
  api: {
    baseUrl:
      import.meta.env.MODE === 'production'
        ? '/api'
        : (import.meta.env.VITE_API_BASE_URL as string),
  },
  app: {
    name: 'Ayunis Core',
    version: '1.0.0',
  },
  features: {
    devtools: import.meta.env.MODE !== 'production',
    announcableOrgId: runtimeEnv('VITE_ANNOUNCABLE_ORG_ID'),
  },
  analytics: {
    gtmContainerId: runtimeEnv('VITE_GTM_CONTAINER_ID'),
    usercentricsSettingsId: runtimeEnv('VITE_USERCENTRICS_SETTINGS_ID'),
  },
  map: {
    tileUrl:
      runtimeEnv('VITE_MAP_BASEMAP_TILE_URL')?.trim() ||
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      runtimeEnv('VITE_MAP_BASEMAP_ATTRIBUTION')?.trim() ||
      '© OpenStreetMap contributors',
  },
} as const;

export default config;

export const isDevelopment = () => config.env === 'development';
export const isProduction = () => config.env === 'production';
export const isTest = () => config.env === 'test';
