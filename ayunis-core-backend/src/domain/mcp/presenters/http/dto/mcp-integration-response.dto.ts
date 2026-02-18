import { ApiProperty } from '@nestjs/swagger';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';

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
    enum: ['predefined', 'custom', 'marketplace'],
    example: 'predefined',
  })
  type: 'predefined' | 'custom' | 'marketplace';

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
    enum: McpAuthMethod,
    example: McpAuthMethod.BEARER_TOKEN,
  })
  authMethod?: McpAuthMethod;

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
    description: 'Connection status of the integration',
    required: false,
    enum: ['connected', 'disconnected', 'error', 'unknown'],
    example: 'connected',
  })
  connectionStatus?: string;

  @ApiProperty({
    description: 'Last error message if connection failed',
    required: false,
    example: 'Failed to reach server: Connection timeout',
  })
  lastConnectionError?: string;

  @ApiProperty({
    description: 'Timestamp of the last connection check',
    required: false,
    example: '2025-10-28T14:30:00.000Z',
  })
  lastConnectionCheck?: Date;

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

  @ApiProperty({
    description:
      'Whether tools from this integration may return PII data that should be anonymized in anonymous mode',
    example: true,
  })
  returnsPii: boolean;

  @ApiProperty({
    description:
      'Marketplace integration identifier (only for marketplace integrations)',
    required: false,
    example: 'oparl-council-data',
  })
  marketplaceIdentifier?: string;

  @ApiProperty({
    description:
      'Configuration schema from marketplace (only for marketplace integrations)',
    required: false,
  })
  configSchema?: {
    authType: string;
    orgFields: unknown[];
    userFields: unknown[];
  };

  @ApiProperty({
    description:
      'Whether this marketplace integration has user-level config fields',
    required: false,
    example: false,
  })
  hasUserFields?: boolean;
}
