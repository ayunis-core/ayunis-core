import { ApiProperty } from '@nestjs/swagger';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class PiiMaskResponseDto {
  @ApiProperty({
    description:
      'The placeholder token as it appears in message text, e.g. {{pii:PERSON_NAME_1}}',
    example: '{{pii:PERSON_NAME_1}}',
  })
  token: string;

  @ApiProperty({
    description: 'The original value the token stands in for',
    example: 'Max Mustermann',
  })
  value: string;

  @ApiProperty({
    description: 'PII category of the masked value',
    enum: PiiCategory,
    enumName: 'PiiCategory',
    example: PiiCategory.PERSON_NAME,
  })
  category: PiiCategory;
}
