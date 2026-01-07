// Simple configuration for Vite environment
const config = {
  env:
    (import.meta.env.MODE as 'development' | 'production' | 'test') ||
    'development',
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
    announcableOrgId: import.meta.env.VITE_ANNOUNCABLE_ORG_ID as
      | string
      | undefined,
  },
  analytics: {
    gtmContainerId: import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined,
    usercentricsSettingsId: import.meta.env.VITE_USERCENTRICS_SETTINGS_ID as
      | string
      | undefined,
  },
} as const;

export default config;

export const isDevelopment = () => config.env === 'development';
export const isProduction = () => config.env === 'production';
export const isTest = () => config.env === 'test';
