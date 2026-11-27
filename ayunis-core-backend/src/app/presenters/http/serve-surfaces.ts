import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
  type Router,
} from 'express';
import { join } from 'node:path';
import type { FeaturesConfig } from 'src/config/features.config';
import { frameOrigins, isFrameOrigin } from 'src/config/frame-origins';
import {
  isSurfaceEnabled,
  SURFACE_REGISTRY,
  type SurfaceDefinition,
  type SurfaceFraming,
} from 'src/config/surface-registry';

export function serveSurfaces(
  rootPath: string,
  features: FeaturesConfig,
  registry: Readonly<Record<string, SurfaceDefinition>> = SURFACE_REGISTRY,
): Router {
  const router = express.Router();
  const webPath = join(rootPath, 'web');
  const prefixedSurfaces = Object.entries(registry)
    .filter(([, surface]) => surface.staticPrefix !== '/')
    .sort(([, a], [, b]) => b.staticPrefix.length - a.staticPrefix.length);

  // Controller routes are registered before this router. Anything still
  // under /api is therefore missing and must not fall through to the SPA.
  router.use('/api', (_req, res) => {
    res.status(404).end();
  });

  for (const [id, surface] of prefixedSurfaces) {
    router.use(
      surface.staticPrefix,
      servePrefixedSurface(
        join(rootPath, id),
        webPath,
        surface,
        isSurfaceEnabled(surface, features),
      ),
    );
  }

  router.use(staticAssets(webPath));
  // A browser that parses the shell as a script reports an unattributable
  // SyntaxError instead of a load failure the chunk-reload recovery handles.
  // no-store: during a rollout an old process may 404 a hash the new one has.
  router.use('/assets', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).end();
  });
  router.get('/{*route}', (_req, res, next) =>
    sendHtml(res, next, webPath, 'index.html'),
  );
  return router;
}

function servePrefixedSurface(
  rootPath: string,
  webPath: string,
  surface: SurfaceDefinition,
  enabled: boolean,
): Router {
  const router = express.Router();
  router.use((_, res, next) => {
    if (!enabled) {
      res.status(404).end();
      return;
    }
    next();
  });
  if (surface.webShellPaths?.length) {
    router.get([...surface.webShellPaths], (_req, res, next) =>
      sendHtml(res, next, webPath, 'index.html'),
    );
  }
  if (surface.framing) {
    const framing = surface.framing;
    for (const document of framing.documents) {
      router.get(`/${document}`, async (req, res, next) => {
        const origins = await resolveFrameOrigins(framing, req);
        sendHtml(res, next, rootPath, document, origins);
      });
    }
  }
  router.use(staticAssets(rootPath));
  router.use((_, res) => {
    res.status(404).end();
  });
  return router;
}

async function resolveFrameOrigins(
  framing: SurfaceFraming,
  request: Request,
): Promise<readonly string[]> {
  if ('resolveOrigins' in framing) {
    const origins = await framing.resolveOrigins(request);
    const production = process.env.NODE_ENV === 'production';
    return origins.filter((origin) => isFrameOrigin(origin, production));
  }
  return frameOrigins(
    process.env[framing.originsEnvKey],
    framing.defaultOrigins,
  );
}

function staticAssets(rootPath: string): RequestHandler {
  return express.static(rootPath, {
    setHeaders: (res, path) => {
      if (/\.html?$/i.test(path)) {
        setHtmlHeaders(res);
      }
    },
  });
}

function sendHtml(
  res: Response,
  next: NextFunction,
  root: string,
  file: string,
  origins?: readonly string[],
): void {
  setHtmlHeaders(res, origins);
  res.sendFile(file, { root }, (error?: Error) => {
    if (error) next(error);
  });
}

function setHtmlHeaders(
  res: Pick<Response, 'setHeader'>,
  origins: readonly string[] = [],
): void {
  // Restored tabs can reuse an old shell whose hashed assets are gone.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Security-Policy',
    `frame-ancestors ${["'self'", ...origins].join(' ')}`,
  );
}
