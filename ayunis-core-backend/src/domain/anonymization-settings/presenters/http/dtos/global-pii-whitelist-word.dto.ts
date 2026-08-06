import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class GlobalPiiWhitelistWordDto {
  @ApiProperty({ format: 'uuid' })
  id: UUID;

  @ApiProperty({ enum: PiiCategory, enumName: 'PiiCategory' })
  category: PiiCategory;

  @ApiProperty({ description: 'The word exempted from anonymization' })
  word: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Email of the super admin who added the word',
  })
  createdByEmail: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
