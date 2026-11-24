import type { ServeStaticModuleOptions } from '@nestjs/serve-static';
import type { Response } from 'express';
import { join } from 'path';
import { isSurfaceFeatureEnabled } from 'src/config/features.config';
import { frameOrigins } from 'src/config/frame-origins';
import {
  SURFACE_REGISTRY,
  type SurfaceDefinition,
} from 'src/config/surface-registry';

// Chrome reuses a stored index.html without revalidating when it restores a
// discarded tab (a back_forward load), even under no-cache. The restored
// shell then requests entry chunks a later deploy deleted and renders blank.
// serve-static also invokes setHeaders for its SPA fallback, so this covers
// every client route.
//
// Static files bypass SecurityHeadersMiddleware, so framing is limited here.
// The SPA fallback stays 'self' even if a manifest points at a client-side route.
export function serveFrontendOptions(
  rootPath: string,
): ServeStaticModuleOptions {
  const framedDocuments = new Map(
    Object.values<SurfaceDefinition>(SURFACE_REGISTRY).flatMap((surface) =>
      (surface.framing?.documents ?? []).map(
        (document) =>
          [join(rootPath, surface.staticPrefix, document), surface] as const,
      ),
    ),
  );
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
          `frame-ancestors ${frameAncestors(framedDocuments.get(path)).join(' ')}`,
        );
      },
    },
  };
}

function frameAncestors(
  surface: SurfaceDefinition | undefined,
): readonly string[] {
  if (!surface?.framing || !isSurfaceFeatureEnabled(surface.featureFlag)) {
    return ["'self'"];
  }
  const { framing } = surface;
  return [
    "'self'",
    ...frameOrigins(process.env[framing.originsEnvKey], framing.defaultOrigins),
  ];
}
