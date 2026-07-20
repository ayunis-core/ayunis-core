import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { MAX_PATTERN_LENGTH } from 'src/domain/anonymization-settings/domain/validate-pattern';

export class PiiWhitelistEntryDto {
  @ApiProperty({
    description: 'PII category exempt from anonymization',
    enum: PiiCategory,
    enumName: 'PiiCategory',
    example: PiiCategory.EMAIL_ADDRESS,
  })
  @IsEnum(PiiCategory)
  category: PiiCategory;

  @ApiProperty({
    description:
      'Optional regex; when set, only values fully matching it (case-insensitive) are exempt. Null exempts the whole category.',
    example: '.*@muster-stadt\\.de',
    type: String,
    nullable: true,
    maxLength: MAX_PATTERN_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_PATTERN_LENGTH)
  pattern: string | null;
}
