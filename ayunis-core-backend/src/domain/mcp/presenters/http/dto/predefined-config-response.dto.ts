import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for predefined MCP integration configuration metadata.
 * Returns public information about available predefined integrations.
 * Note: Server URLs are NOT exposed for security (kept private).
 */
export class PredefinedConfigResponseDto {
  @ApiProperty({
    description: 'Unique slug identifier for the predefined integration',
    example: 'TEST',
  })
  slug: string;

  @ApiProperty({
    description: 'Display name for the integration',
    example: 'Test MCP Server',
  })
  displayName: string;

  @ApiProperty({
    description: 'Description of what this integration provides',
    example: 'Test integration for development and testing',
  })
  description: string;

  @ApiProperty({
    description: 'Default authentication method (if any)',
    required: false,
    example: 'BEARER_TOKEN',
  })
  defaultAuthMethod?: string;

  @ApiProperty({
    description: 'Default authentication header name (if any)',
    required: false,
    example: 'Authorization',
  })
  defaultAuthHeaderName?: string;
}
