import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { BasePermittedModelResponseDto } from './base-permitted-model-response.dto';

export class PermittedEmbeddingModelResponseDto extends BasePermittedModelResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The catalog model UUID',
  })
  modelId: UUID;

  @ApiProperty({
    type: 'string',
    enum: [ModelType.EMBEDDING],
    description: 'The type of the model (always embedding)',
  })
  type: ModelType.EMBEDDING;

  @ApiProperty({
    type: 'number',
    description: 'The number of dimensions for embeddings',
    nullable: true,
  })
  dimensions?: number;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether this model enforces anonymous mode',
  })
  anonymousOnly: boolean;
}
