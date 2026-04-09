import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';

export class AvailableImageGenerationModelResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The id of the catalog model',
  })
  modelId: UUID;

  @ApiProperty({
    type: 'string',
    description:
      'The id of the permitted model. Null if the model is not permitted.',
    nullable: true,
  })
  permittedModelId?: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The model name',
  })
  name: string;

  @ApiProperty({
    type: 'string',
    enum: [ModelProvider.AZURE],
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
    enum: [ModelType.IMAGE_GENERATION],
    description: 'The type of the model (always image-generation)',
  })
  type: ModelType.IMAGE_GENERATION;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model is permitted for the org',
  })
  isPermitted: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether this model enforces anonymous mode. Null if not permitted.',
    nullable: true,
  })
  anonymousOnly?: boolean;
}
