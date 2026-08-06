import { ApiProperty } from '@nestjs/swagger';
import { PiiWhitelistEntryDto } from './pii-whitelist-entry.dto';
import { GlobalPiiWhitelistWordSummaryDto } from './global-pii-whitelist-word-summary.dto';

export class PiiWhitelistResponseDto {
  @ApiProperty({
    description: 'Current whitelist entries for the org',
    type: [PiiWhitelistEntryDto],
  })
  entries: PiiWhitelistEntryDto[];

  @ApiProperty({
    description:
      'Words exempted platform-wide by Ayunis, read-only for org admins',
    type: [GlobalPiiWhitelistWordSummaryDto],
  })
  globalWords: GlobalPiiWhitelistWordSummaryDto[];
}
