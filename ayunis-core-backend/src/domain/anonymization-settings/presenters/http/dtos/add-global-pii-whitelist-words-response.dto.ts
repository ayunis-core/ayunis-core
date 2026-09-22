import { ApiProperty } from '@nestjs/swagger';
import { GlobalPiiWhitelistWordDto } from './global-pii-whitelist-word.dto';

export class AddGlobalPiiWhitelistWordsResponseDto {
  @ApiProperty({ type: [GlobalPiiWhitelistWordDto] })
  added: GlobalPiiWhitelistWordDto[];

  @ApiProperty({
    type: [String],
    description: 'Submitted words that were already on the whitelist',
  })
  duplicates: string[];
}
