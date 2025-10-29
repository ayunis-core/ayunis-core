import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for MCP integration data.
 * Used in API responses to return MCP integration information.
 * Note: Authentication credentials are NEVER exposed in responses.
 */
export class McpIntegrationResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the integration',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the integration',
    example: 'Production Test Integration',
  })
  name: string;

  @ApiProperty({
    description: 'Type of integration',
    enum: ['predefined', 'custom'],
    example: 'predefined',
  })
  type: 'predefined' | 'custom';

  @ApiProperty({
    description:
      'Predefined integration slug (only for predefined integrations)',
    required: false,
    example: 'TEST',
  })
  slug?: string;

  @ApiProperty({
    description: 'Custom server URL (only for custom integrations)',
    required: false,
    example: 'https://my-server.com/mcp',
  })
  serverUrl?: string;

  @ApiProperty({
    description: 'Whether the integration is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Organization that owns this integration',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Authentication method used',
    required: false,
    example: 'BEARER_TOKEN',
  })
  authMethod?: string;

  @ApiProperty({
    description: 'Custom auth header name',
    required: false,
    example: 'Authorization',
  })
  authHeaderName?: string;

  @ApiProperty({
    description:
      'Whether credentials are configured (never exposes actual credentials)',
    example: true,
  })
  hasCredentials: boolean;

  @ApiProperty({
    description: 'Timestamp when the integration was created',
    example: '2025-10-28T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the integration was last updated',
    example: '2025-10-28T12:30:00.000Z',
  })
  updatedAt: Date;
}
