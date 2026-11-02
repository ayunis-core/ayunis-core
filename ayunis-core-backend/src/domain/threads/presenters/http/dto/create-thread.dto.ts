import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { UUID } from 'crypto';

export class CreateThreadDto {
  @ApiPropertyOptional({
    description: 'The id of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  modelId?: UUID;

  @ApiPropertyOptional({
    description:
      'Start the chat in a mode instead of with a specific model; mutually exclusive with modelId',
    enum: ModelMode,
    enumName: 'ModelMode',
  })
  @IsEnum(ModelMode)
  @IsOptional()
  mode?: ModelMode;

  @ApiPropertyOptional({
    description: 'Enable anonymous mode for this thread',
    example: false,
    default: false,
    type: 'boolean',
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'File the new thread under this workspace',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: UUID;
}
