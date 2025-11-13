import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

export class EmbeddingModelResponseDto {
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
    example: 'text-embedding-3-small',
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
    example: 'Text Embedding 3 Small',
  })
  displayName: string;

  @ApiProperty({
    type: 'string',
    enum: [ModelType.EMBEDDING],
    description: 'The type of the model (always embedding)',
  })
  type: ModelType.EMBEDDING;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model is archived',
    example: false,
  })
  isArchived: boolean;

  @ApiProperty({
    type: 'number',
    enum: Object.values(EmbeddingDimensions),
    description: 'The dimensions of the embedding',
    example: EmbeddingDimensions.DIMENSION_1536,
  })
  dimensions: EmbeddingDimensions;

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
