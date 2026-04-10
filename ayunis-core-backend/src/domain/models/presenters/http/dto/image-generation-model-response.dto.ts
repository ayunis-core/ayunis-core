import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { SUPPORTED_IMAGE_GENERATION_PROVIDERS } from 'src/domain/models/application/services/model-policy.service';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';

export class ImageGenerationModelResponseDto {
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
    example: 'gpt-image-1',
  })
  name: string;

  @ApiProperty({
    type: 'string',
    enum: SUPPORTED_IMAGE_GENERATION_PROVIDERS,
    description: 'The provider of the model',
    example: ModelProvider.AZURE,
  })
  provider: ModelProvider;

  @ApiProperty({
    type: 'string',
    description: 'The display name of the model',
    example: 'GPT Image 1',
  })
  displayName: string;

  @ApiProperty({
    type: 'string',
    enum: [ModelType.IMAGE_GENERATION],
    description: 'The type of the model (always image-generation)',
  })
  type: ModelType.IMAGE_GENERATION;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model is archived',
    example: false,
  })
  isArchived: boolean;

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
