import { ApiProperty } from '@nestjs/swagger';

export class FeatureTogglesResponseDto {
  @ApiProperty({
    description: 'Whether the agents feature is enabled',
    example: true,
  })
  agentsEnabled: boolean;

  @ApiProperty({
    description: 'Whether the standalone knowledge bases feature is enabled',
    example: true,
  })
  knowledgeBasesEnabled: boolean;

  @ApiProperty({
    description: 'Whether the prompts feature is enabled',
    example: true,
  })
  promptsEnabled: boolean;

  @ApiProperty({
    description: 'Whether the skills feature is enabled',
    example: false,
  })
  skillsEnabled: boolean;
}
