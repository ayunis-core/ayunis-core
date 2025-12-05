import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';

export class LanguageModelResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The name of the model',
    example: 'gpt-4',
  })
  name: string;

  @ApiProperty({
    type: 'string',
    enum: Object.values(ModelProvider),
    description: 'The provider of the model',
    example: ModelProvider.OPENAI,
  })
  provider: ModelProvider;

  @ApiProperty({
    type: 'string',
    description: 'The display name of the model',
    example: 'GPT-4',
  })
  displayName: string;

  @ApiProperty({
    type: 'string',
    enum: [ModelType.LANGUAGE],
    description: 'The type of the model (always language)',
  })
  type: ModelType.LANGUAGE;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model is archived',
    example: false,
  })
  isArchived: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model supports streaming',
    example: true,
  })
  canStream: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model supports tool use',
    example: true,
  })
  canUseTools: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model has reasoning capabilities',
    example: false,
  })
  isReasoning: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model supports vision (image processing)',
    example: false,
  })
  canVision: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the model was created',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the model was last updated',
  })
  updatedAt: Date;
}
