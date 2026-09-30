import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class AddGlobalPiiWhitelistWordsRequestDto {
  @ApiProperty({ enum: PiiCategory, enumName: 'PiiCategory' })
  @IsEnum(PiiCategory)
  category: PiiCategory;

  @ApiProperty({
    type: [String],
    description: 'Plain words to exempt from anonymization (no patterns)',
    maxItems: 1000,
    example: ['Mitarbeitende', 'Bürgeramt'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  words: string[];
}
