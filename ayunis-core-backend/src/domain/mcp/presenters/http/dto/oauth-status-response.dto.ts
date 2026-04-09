import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for OAuth authorization status.
 */
export class OAuthStatusResponseDto {
  @ApiProperty({
    description:
      'Whether OAuth is configured at org level or user level for this integration',
    enum: ['org', 'user'],
    example: 'org',
  })
  level: 'org' | 'user';

  @ApiProperty({
    description: 'Whether a valid OAuth token exists',
    example: true,
  })
  authorized: boolean;

  @ApiPropertyOptional({
    description:
      'When the access token expires (null if no expiry or not authorized)',
    type: 'string',
    format: 'date-time',
    nullable: true,
    example: '2025-12-31T23:59:59.000Z',
  })
  expiresAt: Date | null;

  @ApiPropertyOptional({
    description: 'OAuth scopes granted (null if not authorized)',
    type: 'string',
    nullable: true,
    example: 'read write',
  })
  scope: string | null;
}
