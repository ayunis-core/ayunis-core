import { ApiProperty } from '@nestjs/swagger';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

/**
 * Read-only view of a global whitelist word as shown to org admins —
 * no ids or audit data, just what is exempted.
 */
export class GlobalPiiWhitelistWordSummaryDto {
  @ApiProperty({ enum: PiiCategory, enumName: 'PiiCategory' })
  category: PiiCategory;

  @ApiProperty({ description: 'The word exempted from anonymization' })
  word: string;
}
