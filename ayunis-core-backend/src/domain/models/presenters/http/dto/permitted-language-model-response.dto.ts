import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { BasePermittedModelResponseDto } from './base-permitted-model-response.dto';

export class PermittedLanguageModelResponseDto extends BasePermittedModelResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The catalog model UUID',
  })
  modelId: UUID;

  @ApiProperty({
    type: 'string',
    enum: [ModelType.LANGUAGE],
    description: 'The type of the model (always language)',
  })
  type: ModelType.LANGUAGE;

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
