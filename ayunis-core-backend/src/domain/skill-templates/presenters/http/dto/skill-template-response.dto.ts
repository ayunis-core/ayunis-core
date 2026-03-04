import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { DistributionMode } from '../../../domain/distribution-mode.enum';

export class SkillTemplateResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the skill template',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The name of the skill template',
    example: 'Legal Guidelines',
  })
  name: string;

  @ApiProperty({
    type: 'string',
    description: 'A short description of the skill template',
    example: 'Legal compliance instructions for all responses',
  })
  shortDescription: string;

  @ApiProperty({
    type: 'string',
    description: 'The instructions for the skill template',
    example: 'Always follow legal guidelines when responding to user queries.',
  })
  instructions: string;

  @ApiProperty({
    type: 'string',
    enum: Object.values(DistributionMode),
    description: 'The distribution mode of the skill template',
    example: DistributionMode.ALWAYS_ON,
  })
  distributionMode: DistributionMode;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the skill template is active',
    example: false,
  })
  isActive: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the skill template was created',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the skill template was last updated',
  })
  updatedAt: Date;
}
