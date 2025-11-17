import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';

export class PermittedEmbeddingModelResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The id of the permitted model',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The name of the model',
  })
  name: string;

  @ApiProperty({
    type: 'string',
    enum: Object.values(ModelProvider),
    description: 'The provider of the model',
  })
  provider: ModelProvider;

  @ApiProperty({
    type: 'string',
    description: 'The display name of the model',
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
  })
  isArchived: boolean;

  @ApiProperty({
    type: 'number',
    description: 'The number of dimensions for embeddings',
    nullable: true,
  })
  dimensions?: number;
}
