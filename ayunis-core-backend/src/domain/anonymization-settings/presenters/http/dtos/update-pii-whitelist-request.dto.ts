import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { PiiWhitelistEntryDto } from './pii-whitelist-entry.dto';

export class UpdatePiiWhitelistRequestDto {
  @ApiProperty({
    description:
      'Full replacement whitelist; an empty array removes all entries',
    type: [PiiWhitelistEntryDto],
    maxItems: 50,
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PiiWhitelistEntryDto)
  entries: PiiWhitelistEntryDto[];
}
