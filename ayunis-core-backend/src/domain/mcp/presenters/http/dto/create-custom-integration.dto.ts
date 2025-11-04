import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsEnum,
  IsOptional,
  Length,
  MinLength,
} from 'class-validator';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';

/**
 * DTO for creating a custom MCP integration.
 * Used when creating an integration with a custom server URL.
 *
 * Validation Rules:
 * - name: Required, 1-255 characters
 * - serverUrl: Required, valid HTTP/HTTPS URL
 * - authMethod: Optional, must be valid enum value if provided
 * - credentials: Optional, but required if authMethod is CUSTOM_HEADER or BEARER_TOKEN
 * - authHeaderName: Optional, recommended for CUSTOM_HEADER auth method
 */
export class CreateCustomIntegrationDto {
  @ApiProperty({
    description: 'The name for this integration instance',
    example: 'My Custom MCP Server',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'The URL of the custom MCP server',
    example: 'https://my-mcp-server.example.com/mcp',
  })
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @IsNotEmpty()
  serverUrl: string;

  @ApiProperty({
    description: 'Authentication method for the MCP server',
    enum: McpAuthMethod,
    example: McpAuthMethod.CUSTOM_HEADER,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(McpAuthMethod)
  authMethod?: McpAuthMethod;

  @ApiProperty({
    description:
      'Custom auth header name (e.g., X-API-Key). Required for CUSTOM_HEADER auth method. Ignored for BEARER_TOKEN (always uses Authorization header).',
    example: 'X-API-Key',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  authHeaderName?: string;

  @ApiProperty({
    description:
      'Authentication credentials (will be encrypted). Required for CUSTOM_HEADER and BEARER_TOKEN auth methods.',
    example: 'my-secret-value-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  credentials?: string;
}
