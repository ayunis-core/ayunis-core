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
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "10000"),
  },
  app: {
    name: "Ayunis Core",
    version: import.meta.env.VITE_APP_VERSION,
  },
  features: {
    devtools: import.meta.env.MODE !== "production",
  },
} as const;

export default config;

export const isDevelopment = () => config.env === "development";
export const isProduction = () => config.env === "production";
export const isTest = () => config.env === "test";
