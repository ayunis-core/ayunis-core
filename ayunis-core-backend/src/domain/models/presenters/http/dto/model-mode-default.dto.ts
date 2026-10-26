import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { UUID } from 'crypto';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export class SetModelModeDefaultDto {
  @ApiProperty({
    enum: ModelMode,
    enumName: 'ModelMode',
    nullable: true,
    description:
      'Mode to use as default; null clears it so the model default applies again',
  })
  @ValidateIf((dto: SetModelModeDefaultDto) => dto.mode !== null)
  @IsEnum(ModelMode)
  mode: ModelMode | null;
}

export class ModelModeDefaultResponseDto {
  @ApiProperty({ enum: ModelMode, enumName: 'ModelMode', nullable: true })
  mode: ModelMode | null;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    nullable: true,
    description:
      'Healthy model the mode currently resolves to on this level (anonymous-only and faulted models skipped)',
  })
  currentPermittedModelId: UUID | null;

  @ApiProperty({
    enum: ModelMode,
    enumName: 'ModelMode',
    isArray: true,
    description:
      'Modes that currently resolve to a model on this level; only these should be offered',
  })
  availableModes: ModelMode[];
}

export class DefaultModelSelectionResponseDto {
  @ApiProperty({
    enum: ModelMode,
    enumName: 'ModelMode',
    nullable: true,
    description: 'Preselected mode; null when a concrete model is preselected',
  })
  mode: ModelMode | null;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Permitted model a new chat binds with this selection',
  })
  permittedModelId: UUID;
}
