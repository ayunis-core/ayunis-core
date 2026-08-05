import Appsignal from '@appsignal/javascript';
import type { Span } from '@appsignal/javascript';

// The package does not re-export its hook types (only Breadcrumb and Span).
type Override = (span: Span) => Span | false;
import { plugin as windowEventsPlugin } from '@appsignal/plugin-window-events';
import { runtimeEnv } from '@/shared/config/runtime-env';

/**
 * Expected browser noise, matched against the error message (AppSignal
 * `ignoreErrors`). Mirrors the backend policy of not alerting on expected
 * client behavior: cancelled requests, network blips and ResizeObserver
 * warnings are not actionable incidents (AYC-539).
 */
export const ignoredErrorPatterns: RegExp[] = [
  // Aborted fetch/XHR: "The user aborted a request." (Chrome), "The
  // operation was aborted." (Firefox), "Fetch is aborted" (Safari),
  // "signal is aborted without reason" (AbortController default).
  /\baborted\b/i,
  // Axios CanceledError, thrown when a request is cancelled on unmount
  // or navigation.
  /^canceled$/i,
  // Network blips: Chrome fetch, Firefox fetch, axios, Safari fetch.
  // Anchored: Vite's "Failed to fetch dynamically imported module" must
  // stay reportable — it is the unrecovered-deploy-skew signal the
  // ErrorBoundary deliberately reports after chunk-reload recovery fails.
  /^Failed to fetch$/i,
  /NetworkError/i,
  /Network Error/i,
  /^Load failed$/i,
  // Spec-mandated benign warning, surfaces as a window error event.
  /ResizeObserver loop/i,
];

/**
 * Strips the deployment-specific origin from backtrace paths so all
 * environments report `assets/<chunk>.js`. CI uploads sourcemaps under
 * exactly these names (see the sourcemaps job in build-images.yml), which
 * is what lets one build's maps resolve traces from every hostname.
 */
export const backtracePathMatchers: RegExp[] = [
  /https?:\/\/[^/]+\/(assets\/[^\s?#]+)/,
];

const extensionUrlPattern =
  /(?:chrome|moz|safari|safari-web|ms-browser)-extension:\/\//;

/**
 * True when the topmost frame with a location is extension-injected —
 * the error originated in browser-extension code, not ours.
 */
export function isBrowserExtensionError(span: Span): boolean {
  const backtrace = span.getError()?.backtrace ?? [];
  const originFrame = backtrace.find((line) => line.includes('://'));
  return originFrame !== undefined && extensionUrlPattern.test(originFrame);
}

// Returning false is how an AppSignal Override drops a span.
export const dropBrowserExtensionErrors: Override = (span) =>
  isBrowserExtensionError(span) ? false : span;

let contextTags: Record<string, string> = {};

/** Ids only — no names, emails or chat content (same policy as the backend). */
export function setAppsignalTags(tags: {
  userId?: string;
  orgId?: string;
}): void {
  contextTags = {
    ...(tags.userId ? { user_id: tags.userId } : {}),
    ...(tags.orgId ? { org_id: tags.orgId } : {}),
  };
}

export function clearAppsignalTags(): void {
  contextTags = {};
}

export function applyContextTags(span: Span): Span {
  return span.setTags(contextTags);
}

let appsignal: Appsignal | undefined;

export function initAppsignal() {
  const key = runtimeEnv('VITE_APPSIGNAL_FRONTEND_KEY');

  if (import.meta.env.PROD && key) {
    appsignal = new Appsignal({
      key,
      // Baked in at build time (Dockerfile build arg), matching the
      // APP_REVISION the backend reports — incidents map to deploys and
      // to the sourcemaps CI uploaded for this revision.
      revision:
        (import.meta.env.VITE_APP_REVISION as string | undefined) || undefined,
      ignoreErrors: ignoredErrorPatterns,
      matchBacktracePaths: backtracePathMatchers,
    });
    appsignal.addDecorator(applyContextTags);
    appsignal.addOverride(dropBrowserExtensionErrors);
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
