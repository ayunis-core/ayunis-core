import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ReindexIntervalDto } from './reindex-interval.dto';

export class SetDocumentReindexScheduleRequestDto {
  @ApiProperty({
    description:
      'How often the web source is re-indexed automatically; null stops automatic re-indexing',
    type: ReindexIntervalDto,
    nullable: true,
  })
  // Explicit null clears the schedule; an omitted property is rejected so a
  // malformed request can never clear it by accident.
  @ValidateIf((_, value) => value !== null)
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ReindexIntervalDto)
  reindexInterval: ReindexIntervalDto | null;
}
