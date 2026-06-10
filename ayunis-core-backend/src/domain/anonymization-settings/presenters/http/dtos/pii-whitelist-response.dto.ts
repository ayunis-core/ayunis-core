import { ApiProperty } from '@nestjs/swagger';
import { PiiWhitelistEntryDto } from './pii-whitelist-entry.dto';

export class PiiWhitelistResponseDto {
  @ApiProperty({
    description: 'Current whitelist entries for the org',
    type: [PiiWhitelistEntryDto],
  })
  entries: PiiWhitelistEntryDto[];
}
