import { ApiProperty } from '@nestjs/swagger';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { BasePermittedModelResponseDto } from './base-permitted-model-response.dto';

export class PermittedEmbeddingModelResponseDto extends BasePermittedModelResponseDto {
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
}
