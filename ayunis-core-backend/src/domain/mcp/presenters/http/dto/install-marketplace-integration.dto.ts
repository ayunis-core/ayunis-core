import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStringRecord } from 'src/common/validators/is-string-record.validator';

/**
 * DTO for installing a marketplace MCP integration.
 * The identifier references the integration on the marketplace.
 * orgConfigValues contains user-provided org-level configuration values
 * (fixed-value fields from the schema are merged server-side).
 */
export class InstallMarketplaceIntegrationDto {
  @ApiProperty({
    description: 'Marketplace integration identifier',
    example: 'oparl-council-data',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description:
      'Organization-level configuration values (key-value pairs matching config schema orgFields)',
    example: {
      oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  @IsStringRecord({ message: 'all values in orgConfigValues must be strings' })
  orgConfigValues: Record<string, string>;

  @ApiPropertyOptional({
    description:
      'Whether tools from this integration may return PII data that should be anonymized in anonymous mode',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  returnsPii?: boolean;

  @ApiPropertyOptional({
    description:
      'OAuth client ID (required when the marketplace integration schema includes oauth)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oauthClientId?: string;

  @ApiPropertyOptional({
    description:
      'OAuth client secret (required when the marketplace integration schema includes oauth)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  oauthClientSecret?: string;
}
