/**
 * Runtime-injected environment. The backend serves GET /config.js (loaded in
 * index.html before the app bundle), which sets window.__RUNTIME_CONFIG__
 * from its own process env — so one published image serves every environment
 * without rebuilding. Falls back to Vite's build-time import.meta.env for
 * `pnpm dev`, where the dev-server stub in public/config.js leaves the
 * runtime object empty.
 */
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Readonly<Record<string, string | undefined>>;
  }
}

export function runtimeEnv(key: string): string | undefined {
  return (
    window.__RUNTIME_CONFIG__?.[key] ??
    (import.meta.env[key] as string | undefined) ??
    undefined
  );
}
