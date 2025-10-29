import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';

/**
 * DTO for updating an existing MCP integration.
 * All fields are optional.
 */
export class UpdateMcpIntegrationDto {
  @ApiProperty({
    description: 'The new name for the integration',
    example: 'Updated Integration Name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Authentication method',
    example: McpAuthMethod.BEARER_TOKEN,
    enum: McpAuthMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(McpAuthMethod)
  authMethod?: McpAuthMethod;

  @ApiProperty({
    description: 'Custom auth header name (e.g., X-API-Key)',
    example: 'Authorization',
    required: false,
  })
  @IsOptional()
  @IsString()
  authHeaderName?: string;

  @ApiProperty({
    description: 'New authentication credentials (will be encrypted)',
    example: 'new-credentials-456',
    required: false,
  })
  @IsOptional()
  @IsString()
  credentials?: string;
}
