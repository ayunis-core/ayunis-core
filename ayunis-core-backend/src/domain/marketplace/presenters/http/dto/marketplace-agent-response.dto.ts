import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarketplaceAgentResponseDto {
  @ApiProperty({ description: 'Agent UUID' })
  id: string;

  @ApiProperty({ description: 'Unique identifier (slug)' })
  identifier: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Short description' })
  briefDescription: string;

  @ApiProperty({ description: 'Full system instructions' })
  instructions: string;

  @ApiPropertyOptional({
    description: 'Recommended model name',
    type: 'string',
    nullable: true,
  })
  recommendedModelName: string | null;

  @ApiPropertyOptional({
    description: 'Recommended model provider',
    type: 'string',
    nullable: true,
  })
  recommendedModelProvider: string | null;

  @ApiPropertyOptional({
    description: 'Agent category ID',
    type: 'string',
    nullable: true,
  })
  agentCategoryId: string | null;

  @ApiPropertyOptional({
    description: 'Icon URL',
    type: 'string',
    nullable: true,
  })
  iconUrl: string | null;

  @ApiProperty({ description: 'Whether the agent is featured' })
  featured: boolean;

  @ApiProperty({ description: 'Whether the agent is published' })
  published: boolean;

  @ApiProperty({ description: 'Whether the agent is pre-installed' })
  preInstalled: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
