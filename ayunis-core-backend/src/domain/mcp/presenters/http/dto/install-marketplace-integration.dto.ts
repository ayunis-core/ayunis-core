import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { IsStringRecord } from 'src/common/validators/is-string-record.validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { McpOAuthClientDto } from './create-custom-integration.dto';

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
      "URL of the customer's own MCP server. Required when the marketplace entry lets the customer provide the server URL; rejected otherwise.",
    example: 'https://projekte.stadt.de/mcp',
  })
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  serverUrl?: string;

  @ApiPropertyOptional({ type: McpOAuthClientDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => McpOAuthClientDto)
  oauthClient?: McpOAuthClientDto;
}
