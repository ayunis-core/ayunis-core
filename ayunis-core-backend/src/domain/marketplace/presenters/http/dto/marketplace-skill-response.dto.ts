import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarketplaceSkillResponseDto {
  @ApiProperty({ description: 'Skill UUID' })
  id: string;

  @ApiProperty({ description: 'Unique identifier (slug)' })
  identifier: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Short description for marketplace display' })
  shortDescription: string;

  @ApiProperty({
    description: 'Description shown to LLM to decide activation',
  })
  aiDescription: string;

  @ApiProperty({
    description:
      'Detailed instructions injected into the conversation when the skill is activated',
  })
  instructions: string;

  @ApiPropertyOptional({
    description: 'Skill category ID',
    type: 'string',
    nullable: true,
  })
  skillCategoryId: string | null;

  @ApiPropertyOptional({
    description: 'Icon URL',
    type: 'string',
    nullable: true,
  })
  iconUrl: string | null;

  @ApiProperty({ description: 'Whether the skill is featured' })
  featured: boolean;

  @ApiProperty({ description: 'Whether the skill is published' })
  published: boolean;

  @ApiProperty({ description: 'Whether the skill is pre-installed' })
  preInstalled: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
