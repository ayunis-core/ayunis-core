import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length, MinLength } from 'class-validator';

/**
 * DTO for updating an existing MCP integration.
 * All fields are optional, allowing partial updates.
 *
 * Validation Rules:
 * - name: Optional, 1-255 characters if provided
 * - authMethod: Optional, must be valid enum value if provided
 * - authHeaderName: Optional, 1-255 characters if provided
 * - credentials: Optional, but when provided for API_KEY/BEARER_TOKEN, must be non-empty
 *
 * Note: Updating credentials will re-encrypt the new value.
 */
export class UpdateMcpIntegrationDto {
  @ApiProperty({
    description: 'The new name for the integration',
    example: 'Updated Integration Name',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiProperty({
    description:
      'Authentication credentials (will be encrypted). Provide to rotate the stored secret/token.',
    example: 'new-secret-value-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  credentials?: string;

  @ApiProperty({
    description:
      'Custom auth header name. Only used in combination with CUSTOM_HEADER integrations.',
    example: 'X-API-Key',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  authHeaderName?: string;
}
