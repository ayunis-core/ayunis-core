import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

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
 * @param property - Optional property to extract from the user object
 * @returns The entire user object or the specified property
 *
 * Example usage:
 * ```
 * @Get()
 * getProfile(@CurrentUser(UserProperty.FULL_USER) user: any) {}
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
    const user = request.user;

    if (!user) {
      return null;
    }

    if (property === UserProperty.FULL_USER) {
      return user;
    }

    return user[property as keyof typeof user];
  },
);
