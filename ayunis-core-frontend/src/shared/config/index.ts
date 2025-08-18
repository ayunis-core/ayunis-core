// Simple configuration for Vite environment
const config = {
  env:
    (import.meta.env.MODE as "development" | "production" | "test") ||
    "development",
  api: {
    baseUrl:
      import.meta.env.MODE === "production"
        ? "/api"
        : import.meta.env.VITE_API_BASE_URL,
  },
  app: {
    name: "Ayunis Core",
    version: import.meta.env.VITE_APP_VERSION,
  },
  features: {
    devtools: import.meta.env.MODE !== "production",
  },
  analytics: {
    gtmContainerId: import.meta.env.VITE_GTM_CONTAINER_ID,
  },
} as const;

export default config;

export const isDevelopment = () => config.env === "development";
export const isProduction = () => config.env === "production";
export const isTest = () => config.env === "test";
