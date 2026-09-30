import type { ServeStaticModuleOptions } from '@nestjs/serve-static';
import type { Response } from 'express';

// Chrome reuses a stored index.html without revalidating when it restores a
// discarded tab (a back_forward load), even under no-cache. The restored
// shell then requests entry chunks a later deploy deleted and renders blank.
// serve-static also invokes setHeaders for its SPA fallback, so this covers
// every client route.
export function serveFrontendOptions(
  rootPath: string,
): ServeStaticModuleOptions {
  return {
    rootPath,
    serveStaticOptions: {
      setHeaders: (res: Response, path: string) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    },
  };
}
