import type { ServeStaticModuleOptions } from '@nestjs/serve-static';
import type { Response } from 'express';
import { join } from 'path';
import { parseBooleanWithDefault } from 'src/config/features.config';
import { outlookFrameOrigins } from 'src/config/outlook-frame-origins';

// Chrome reuses a stored index.html without revalidating when it restores a
// discarded tab (a back_forward load), even under no-cache. The restored
// shell then requests entry chunks a later deploy deleted and renders blank.
// serve-static also invokes setHeaders for its SPA fallback, so this covers
// every client route.
//
// Static files bypass SecurityHeadersMiddleware, so framing is limited here.
// Only the task pane entry document may be framed by Outlook; the SPA fallback
// stays 'self' so an add-in manifest pointed at an app route cannot frame it.
export function serveFrontendOptions(
  rootPath: string,
): ServeStaticModuleOptions {
  const taskpanePath = join(rootPath, 'outlook', 'taskpane.html');
  return {
    rootPath,
    serveStaticOptions: {
      setHeaders: (res: Response, path: string) => {
        if (!path.endsWith('.html')) {
          return;
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader(
          'Content-Security-Policy',
          `frame-ancestors ${frameAncestors(path === taskpanePath).join(' ')}`,
        );
      },
    },
  };
}

function frameAncestors(isTaskpane: boolean): string[] {
  const outlookAddinEnabled = parseBooleanWithDefault(
    process.env.FEATURE_OUTLOOK_ADDIN_ENABLED,
    false,
  );
  if (!isTaskpane || !outlookAddinEnabled) {
    return ["'self'"];
  }
  return [
    "'self'",
    ...outlookFrameOrigins(process.env.OUTLOOK_ADDIN_FRAME_ORIGINS),
  ];
}
