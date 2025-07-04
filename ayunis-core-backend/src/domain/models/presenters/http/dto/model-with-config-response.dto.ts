import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class ModelWithConfigResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The id of the model',
  })
  modelId: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The id of the model. Null if the model is not permitted.',
    nullable: true,
  })
  permittedModelId?: UUID;

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
    type: 'boolean',
    description: 'Whether the model can stream',
  })
  canStream: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model can reason',
  })
  isReasoning: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model is permitted to be used',
  })
  isPermitted: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the model is the default model',
  })
  isDefault: boolean;
}
