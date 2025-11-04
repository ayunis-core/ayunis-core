import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Length,
  MinLength,
} from 'class-validator';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';

/**
 * DTO for creating a predefined MCP integration.
 * Used when creating an integration from a predefined configuration.
 *
 * Validation Rules:
 * - name: Required, 1-255 characters
 * - slug: Required, must be valid predefined integration slug
 * - authMethod: Optional, must be valid enum value if provided
 * - credentials: Optional, but required if authMethod is CUSTOM_HEADER or BEARER_TOKEN
 * - authHeaderName: Optional, can be overridden from predefined defaults
 */
export class CreatePredefinedIntegrationDto {
  @ApiProperty({
    description: 'The name for this integration instance',
    example: 'Production Test Integration',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'The predefined integration slug',
    example: PredefinedMcpIntegrationSlug.TEST,
    enum: PredefinedMcpIntegrationSlug,
  })
  @IsEnum(PredefinedMcpIntegrationSlug)
  @IsNotEmpty()
  slug: PredefinedMcpIntegrationSlug;

  @ApiProperty({
    description:
      'Authentication method (overrides predefined defaults if provided)',
    enum: McpAuthMethod,
    example: McpAuthMethod.BEARER_TOKEN,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(McpAuthMethod)
  authMethod?: McpAuthMethod;

  @ApiProperty({
    description:
      'Custom auth header name (e.g., X-API-Key). Can override predefined defaults for CUSTOM_HEADER auth method. Ignored for BEARER_TOKEN (always uses Authorization header).',
    example: 'X-API-Key',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  authHeaderName?: string;

  @ApiProperty({
    description:
      'Authentication credentials (will be encrypted). Required if authMethod requires credentials.',
    example: 'sk_test_123abc',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  credentials?: string;
}
