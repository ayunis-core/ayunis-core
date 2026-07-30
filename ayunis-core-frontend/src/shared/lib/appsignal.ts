import Appsignal from '@appsignal/javascript';
import { plugin as windowEventsPlugin } from '@appsignal/plugin-window-events';
import { runtimeEnv } from '@/shared/config/runtime-env';

let appsignal: Appsignal | undefined;

export function initAppsignal() {
  const key = runtimeEnv('VITE_APPSIGNAL_FRONTEND_KEY');

  if (import.meta.env.PROD && key) {
    appsignal = new Appsignal({ key });
    // Captures uncaught errors and unhandled promise rejections
    appsignal.use(windowEventsPlugin());
  }
}

/**
 * Reports an error to AppSignal. No-ops when the client is not initialized
 * (development, or no frontend key configured at runtime).
 */
export function reportError(
  error: Error,
  params?: Record<string, unknown>,
): void {
  void appsignal?.sendError(error, (span) => {
    if (params) {
      span.setParams(params);
    }
  });
}
