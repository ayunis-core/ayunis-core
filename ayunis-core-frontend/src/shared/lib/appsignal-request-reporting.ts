import { isAxiosError } from 'axios';
import type Appsignal from '@appsignal/javascript';
import { plugin as windowEventsPlugin } from '@appsignal/plugin-window-events';
import { requestErrorDiagnostics } from '@/shared/api/request-error-diagnostics';

export function sendErrorReport(
  client: Appsignal,
  error: Error,
  params?: Record<string, unknown>,
) {
  return client.sendError(error, (span) => {
    const diagnostics = requestErrorDiagnostics(error);
    if (diagnostics) span.setTags(diagnostics);
    if (params) span.setParams(params);
  });
}

export function installWindowErrorReporting(client: Appsignal): void {
  const previousHandler = window.onunhandledrejection;
  const previousErrorHandler = window.onerror;
  client.use(windowEventsPlugin());
  const pluginHandler = window.onunhandledrejection;
  const pluginErrorHandler = window.onerror;
  // The plugin turns the Error into a Span before decorators can read Axios config.
  window.onunhandledrejection = function (event) {
    const reason: unknown = event.reason;
    if (isAxiosError(reason)) {
      void sendErrorReport(client, reason);
      previousHandler?.call(window, event);
    } else {
      pluginHandler?.call(window, event);
    }
  };
  window.onerror = function (event, source, line, column, error): unknown {
    if (isAxiosError(error)) {
      void sendErrorReport(client, error);
      return previousErrorHandler?.call(
        this,
        event,
        source,
        line,
        column,
        error,
      );
    }
    return pluginErrorHandler?.call(this, event, source, line, column, error);
  };
}
