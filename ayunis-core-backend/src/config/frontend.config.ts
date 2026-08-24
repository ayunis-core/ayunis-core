import { registerAs } from '@nestjs/config';

/**
 * Values the SPA reads at runtime via GET /config.js instead of Vite
 * build-time inlining, so one published image serves every environment.
 * Keys keep their VITE_ names because the frontend looks them up under the
 * same name it would use for the import.meta.env fallback.
 *
 * VITE_API_BASE_URL is intentionally absent: production builds hardcode the
 * relative /api base, and in dev the Vite dev server uses the build-time var.
 */
export type FrontendRuntimeConfig = Partial<
  Record<(typeof FRONTEND_RUNTIME_KEYS)[number], string>
>;

export const FRONTEND_RUNTIME_KEYS = [
  'VITE_APPSIGNAL_FRONTEND_KEY',
  'VITE_ANNOUNCABLE_ORG_ID',
  'VITE_PLAUSIBLE_DOMAIN',
  'VITE_PLAUSIBLE_SRC',
  'VITE_GTM_CONTAINER_ID',
  'VITE_USERCENTRICS_SETTINGS_ID',
  'VITE_MAP_BASEMAP_TILE_URL',
  'VITE_MAP_BASEMAP_ATTRIBUTION',
] as const;

export const frontendConfig = registerAs(
  'frontend',
  (): FrontendRuntimeConfig => {
    // Empty/whitespace values count as unset — copying .env.example sets keys
    // to "" via dotenv, which must behave like "not configured".
    const entries = FRONTEND_RUNTIME_KEYS.flatMap((key) => {
      const value = process.env[key]?.trim();
      return value ? [[key, value] as const] : [];
    });
    return Object.fromEntries(entries);
  },
);
