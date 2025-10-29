import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsEnum,
  IsOptional,
  Length,
} from 'class-validator';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';

/**
 * DTO for creating a custom MCP integration.
 * Used when creating an integration with a custom server URL.
 */
export class CreateCustomIntegrationDto {
  @ApiProperty({
    description: 'The name for this integration instance',
    example: 'My Custom MCP Server',
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
    description: 'Authentication method',
    example: McpAuthMethod.API_KEY,
    enum: McpAuthMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(McpAuthMethod)
  authMethod?: McpAuthMethod;

  @ApiProperty({
    description: 'Custom auth header name (e.g., X-API-Key)',
    example: 'X-API-Key',
    required: false,
  })
  @IsOptional()
  @IsString()
  authHeaderName?: string;

  @ApiProperty({
    description: 'Authentication credentials (will be encrypted)',
    example: 'my-api-key-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  credentials?: string;
}
