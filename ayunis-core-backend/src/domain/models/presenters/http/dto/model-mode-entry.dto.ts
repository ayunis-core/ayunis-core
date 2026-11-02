import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UUID } from 'crypto';

export class ModelModeEntryDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Catalog language model ID',
  })
  @IsUUID()
  modelId: UUID;

  @ApiProperty({
    type: 'boolean',
    description: 'Disabled entries keep their position but are skipped',
  })
  @IsBoolean()
  enabled: boolean;
}

export class ReplaceModelModeEntriesDto {
  @ApiProperty({
    type: [ModelModeEntryDto],
    description: 'Complete ordered list, highest preference first',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelModeEntryDto)
  @ArrayUnique((entry: ModelModeEntryDto) => entry.modelId)
  entries: ModelModeEntryDto[];
}
