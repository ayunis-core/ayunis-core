import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { CredentialFieldType } from '../../../domain/predefined-mcp-integration-config';

/**
 * DTO for a single config value (credential field value).
 */
export class ConfigValueDto {
  @ApiProperty({
    description: 'The name/type of the credential field',
    enum: CredentialFieldType,
    example: CredentialFieldType.TOKEN,
  })
  @IsEnum(CredentialFieldType)
  @IsNotEmpty()
  name: CredentialFieldType;

  @ApiProperty({
    description: 'The value for this credential field (will be encrypted)',
    example: 'sk_test_123abc',
  })
  @IsString()
  @IsNotEmpty()
  value: string;
}

/**
 * DTO for creating a predefined MCP integration.
 * Used when creating an integration from a predefined configuration.
 *
 * Validation Rules:
 * - slug: Required, must be valid predefined integration slug
 * - configValues: Required array of config values for credential fields
 */
export class CreatePredefinedIntegrationDto {
  @ApiProperty({
    description: 'The predefined integration slug',
    example: PredefinedMcpIntegrationSlug.TEST,
    enum: PredefinedMcpIntegrationSlug,
  })
  @IsEnum(PredefinedMcpIntegrationSlug)
  @IsNotEmpty()
  slug: PredefinedMcpIntegrationSlug;

  @ApiProperty({
    description: 'List of config values for credential fields',
    type: [ConfigValueDto],
    example: [{ name: CredentialFieldType.TOKEN, value: 'sk_test_123abc' }],
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConfigValueDto)
  configValues!: ConfigValueDto[];

  @ApiPropertyOptional({
    description:
      'Whether tools from this integration may return PII data that should be anonymized in anonymous mode. Defaults to true for safety.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  returnsPii?: boolean;
}
