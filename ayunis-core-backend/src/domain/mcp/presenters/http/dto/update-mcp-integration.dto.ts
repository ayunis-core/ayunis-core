import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

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
}
