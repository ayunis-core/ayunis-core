import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { getPrincipal } from '../util/get-principal';

/**
 * Enum for user properties that can be extracted using the CurrentUser decorator
 */
export enum UserProperty {
  ID = 'id',
  ORG_ID = 'orgId',
  EMAIL = 'email',
  ROLES = 'roles',
  FULL_USER = '__full_user__',
}

/**
 * Type for the parameter of the CurrentUser decorator
 */
export type CurrentUserParam = UserProperty;

/**
 * Custom decorator to extract the current user from the request.
 * Uses an enum to avoid magic strings.
 *
 * Rejects api-key principals — `request.user` is an `ActivePrincipal`
 * (`ActiveUser | ActiveApiKey`), but every consumer of this decorator assumes
 * an `ActiveUser`. Without the kind check, `@CurrentUser(UserProperty.ID)`
 * silently returns `undefined` for an api-key caller (the api-key has no `id`,
 * only `apiKeyId`), exposing user-only handlers via the api-key strategy's
 * USER role. Endpoints that legitimately accept api-key callers (e.g.
 * `/openai/v1/chat/completions`) must read `getPrincipal(request)` directly.
 *
 * @param property - Optional property to extract from the user object
 * @returns The entire user object or the specified property
 *
 * Example usage:
 * ```
 * @Get()
 * getProfile(@CurrentUser(UserProperty.FULL_USER) user: unknown) {}
 *
 * @Get()
 * getUserId(@CurrentUser(UserProperty.ID) userId: string) {}
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    property: CurrentUserParam = UserProperty.FULL_USER,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const principal = getPrincipal(request);

    if (!principal) {
      return null;
    }

    if (principal.kind !== 'user') {
      throw new UnauthorizedException(
        'This endpoint requires a user session and cannot be called with an API key.',
      );
    }

    if (property === UserProperty.FULL_USER) {
      return principal;
    }

    return principal[property as keyof typeof principal];
  },
);
