import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarketplaceIntegrationConfigFieldDto {
  @ApiProperty({ description: 'Unique identifier within the schema' })
  key: string;

  @ApiProperty({ description: 'Display label for the frontend form' })
  label: string;

  @ApiProperty({
    description: 'Field type',
    enum: ['text', 'url', 'secret'],
  })
  type: 'text' | 'url' | 'secret';

  @ApiPropertyOptional({
    description:
      'HTTP header name this field maps to; if absent, field is internal config',
    type: 'string',
    nullable: true,
  })
  headerName: string | null;

  @ApiPropertyOptional({
    description: 'Optional prefix prepended to the value before sending',
    type: 'string',
    nullable: true,
  })
  prefix: string | null;

  @ApiProperty({ description: 'Whether the field must be provided' })
  required: boolean;

  @ApiPropertyOptional({
    description: 'Optional help text for the frontend form',
    type: 'string',
    nullable: true,
  })
  help: string | null;

  @ApiPropertyOptional({
    description:
      'Fixed value from marketplace; if set, field is not shown in forms',
    type: 'string',
    nullable: true,
  })
  value: string | null;
}

export class MarketplaceIntegrationConfigSchemaDto {
  @ApiProperty({ description: 'Auth type for documentation/UI purposes' })
  authType: string;

  @ApiProperty({
    description: 'Fields configured by org admin at install time',
    type: [MarketplaceIntegrationConfigFieldDto],
  })
  orgFields: MarketplaceIntegrationConfigFieldDto[];

  @ApiProperty({
    description: 'Fields configured by individual users',
    type: [MarketplaceIntegrationConfigFieldDto],
  })
  userFields: MarketplaceIntegrationConfigFieldDto[];
}

export class MarketplaceIntegrationResponseDto {
  @ApiProperty({ description: 'Integration UUID' })
  id: string;

  @ApiProperty({ description: 'Unique identifier (slug)' })
  identifier: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Short description for marketplace display' })
  shortDescription: string;

  @ApiProperty({ description: 'Full description' })
  description: string;

  @ApiPropertyOptional({
    description: 'Icon URL',
    type: 'string',
    nullable: true,
  })
  iconUrl: string | null;

  @ApiProperty({ description: 'MCP server URL' })
  serverUrl: string;

  @ApiProperty({
    description:
      'Configuration schema (authType, orgFields, userFields, oauth)',
    type: MarketplaceIntegrationConfigSchemaDto,
  })
  configSchema: MarketplaceIntegrationConfigSchemaDto;

  @ApiProperty({ description: 'Whether the integration is featured' })
  featured: boolean;

  @ApiProperty({ description: 'Whether the integration is published' })
  published: boolean;

  @ApiProperty({ description: 'Whether the integration is pre-installed' })
  preInstalled: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
