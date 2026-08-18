import { ApiProperty } from '@nestjs/swagger';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class PiiMaskResponseDto {
  @ApiProperty({
    description: 'Unique id of the mask dictionary entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

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

  @ApiProperty({
    description:
      'Whether the user manually unmasked this entry for the thread; the token still resolves in stored messages, but the value is no longer masked going forward',
    example: false,
  })
  unmasked: boolean;
}
