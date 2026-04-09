import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsObject,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStringRecord } from 'src/common/validators/is-string-record.validator';

/**
 * DTO for creating a self-defined MCP integration.
 * Self-defined integrations allow org admins to specify a raw configuration
 * schema (the same shape used by marketplace integrations) directly.
 * Only available on self-hosted deployments.
 */
export class CreateSelfDefinedIntegrationDto {
  @ApiProperty({
    description: 'Name of the integration',
    example: 'My Self-Defined MCP Server',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the integration',
    example: 'Provides access to internal tooling',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'URL of the MCP server',
    example: 'https://my-mcp-server.example.com/mcp',
  })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { message: 'serverUrl must be a valid HTTP or HTTPS URL' },
  )
  @IsNotEmpty()
  serverUrl: string;

  @ApiProperty({
    description:
      'Configuration schema defining fields, auth type, and optional OAuth config',
    example: {
      authType: 'NO_AUTH',
      orgFields: [],
      userFields: [],
    },
  })
  @IsObject()
  configSchema: object;

  @ApiProperty({
    description:
      'Organization-level configuration values matching configSchema orgFields',
    example: { endpointUrl: 'https://example.com/api' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  @IsStringRecord({ message: 'all values in orgConfigValues must be strings' })
  orgConfigValues: Record<string, string>;

  @ApiPropertyOptional({
    description: 'OAuth client ID (required when configSchema includes oauth)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oauthClientId?: string;

  @ApiPropertyOptional({
    description:
      'OAuth client secret (required when configSchema includes oauth)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  oauthClientSecret?: string;

  @ApiPropertyOptional({
    description:
      'Whether tools from this integration may return PII data that should be anonymized in anonymous mode',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  returnsPii?: boolean;
}
