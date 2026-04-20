import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { BasePermittedModelResponseDto } from './base-permitted-model-response.dto';

export class PermittedImageGenerationModelResponseDto extends BasePermittedModelResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The catalog model UUID',
  })
  modelId: UUID;

  @ApiProperty({
    type: 'string',
    enum: [ModelType.IMAGE_GENERATION],
    description: 'The type of the model (always image-generation)',
  })
  type: ModelType.IMAGE_GENERATION;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether this model enforces anonymous mode',
  })
  anonymousOnly: boolean;
}
