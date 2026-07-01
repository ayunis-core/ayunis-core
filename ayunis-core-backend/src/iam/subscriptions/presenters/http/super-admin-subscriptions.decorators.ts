import { applyDecorators } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

/**
 * The `orgId` path parameter documentation shared by every super-admin
 * subscriptions endpoint. The description varies per endpoint and is passed in
 * so the generated OpenAPI schema stays identical to the inline form.
 */
export function OrgIdParam(description: string): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name: 'orgId',
      description,
      format: 'uuid',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
  );
}
