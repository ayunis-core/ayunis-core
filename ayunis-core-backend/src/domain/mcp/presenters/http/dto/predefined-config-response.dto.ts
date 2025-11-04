import { ApiProperty } from '@nestjs/swagger';
import { CredentialFieldType } from 'src/domain/mcp/domain/predefined-mcp-integration-config';

export class CredentialFieldDto {
  @ApiProperty({
    description: 'User-friendly label for the credential field',
    example: 'Locaboo 3 API Token',
  })
  label: string;

  @ApiProperty({
    description: 'Input type (text or password)',
    enum: CredentialFieldType,
    example: CredentialFieldType.TOKEN,
  })
  type: CredentialFieldType;

  @ApiProperty({
    description: 'Whether this field is required',
    example: true,
  })
  required: boolean;

  @ApiProperty({
    description: 'Help text to guide users',
    required: false,
    example:
      'Your Locaboo 3 API token will be used to authenticate with Locaboo 4',
  })
  help?: string;
}

/**
 * Response DTO for predefined MCP integration configuration metadata.
 * Returns public information about available predefined integrations.
 * Note: Server URLs are NOT exposed for security (kept private).
 */
export class PredefinedConfigResponseDto {
  @ApiProperty({
    description: 'Unique slug identifier for the predefined integration',
    example: 'LOCABOO',
  })
  slug: string;

  @ApiProperty({
    description: 'Display name for the integration',
    example: 'Locaboo 4',
  })
  displayName: string;

  @ApiProperty({
    description: 'Description of what this integration provides',
    example: 'Connect to Locaboo 4 booking system',
  })
  description: string;

  @ApiProperty({
    description: 'Authentication method for this integration',
    enum: ['NO_AUTH', 'BEARER_TOKEN', 'API_KEY', 'OAUTH'],
    example: 'BEARER_TOKEN',
  })
  authType: string;

  @ApiProperty({
    description: 'HTTP header name for authentication (if applicable)',
    required: false,
    example: 'Authorization',
  })
  authHeaderName?: string;

  @ApiProperty({
    description: 'Credential fields required for this integration',
    type: [CredentialFieldDto],
    required: false,
  })
  credentialFields?: CredentialFieldDto[];
}
