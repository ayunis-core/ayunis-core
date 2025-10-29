import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Length,
} from 'class-validator';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';

/**
 * DTO for creating a predefined MCP integration.
 * Used when creating an integration from a predefined configuration.
 */
export class CreatePredefinedIntegrationDto {
  @ApiProperty({
    description: 'The name for this integration instance',
    example: 'Production Test Integration',
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
    description: 'Authentication credentials (will be encrypted)',
    example: 'sk_test_123abc',
    required: false,
  })
  @IsOptional()
  @IsString()
  credentials?: string;
}
