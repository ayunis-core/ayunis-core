import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';

export class PermittedLanguageModelResponseDto {
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
    description: 'The display name of the provider',
  })
  providerDisplayName: string;

  @ApiProperty({
    type: 'string',
    description: 'The display name of the model',
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
  })
  isArchived: boolean;

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
    description: 'Whether the model supports vision (image processing)',
  })
  canVision: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether this model enforces anonymous mode',
  })
  anonymousOnly: boolean;
}

export class PermittedLanguageModelResponseDtoNullable {
  @ApiProperty({
    description: 'The permitted language model',
    type: PermittedLanguageModelResponseDto,
    nullable: true,
  })
  permittedLanguageModel?: PermittedLanguageModelResponseDto;
}
