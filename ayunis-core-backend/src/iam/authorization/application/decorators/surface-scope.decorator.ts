import { SetMetadata } from '@nestjs/common';
import type { SurfaceScope } from 'src/config/surface-scope';

export const SURFACE_SCOPE_KEY = 'surfaceScope';

export const RequireSurfaceScope = (scope: SurfaceScope) =>
  SetMetadata(SURFACE_SCOPE_KEY, scope);
