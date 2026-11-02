import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export class ModelModeResolutionResponseDto {
  @ApiProperty({ enum: ModelMode, enumName: 'ModelMode' })
  mode: ModelMode;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    nullable: true,
    description:
      'Permitted model a new chat in this mode binds with anonymous mode off; null when the mode is unusable',
  })
  permittedModelId: UUID | null;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    nullable: true,
    description: 'Same, with anonymous mode on',
  })
  anonymousPermittedModelId: UUID | null;
}
