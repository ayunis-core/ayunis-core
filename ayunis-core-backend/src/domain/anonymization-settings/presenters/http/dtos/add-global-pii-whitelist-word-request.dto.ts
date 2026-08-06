import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class AddGlobalPiiWhitelistWordRequestDto {
  @ApiProperty({ enum: PiiCategory, enumName: 'PiiCategory' })
  @IsEnum(PiiCategory)
  category: PiiCategory;

  @ApiProperty({
    description: 'Plain word to exempt from anonymization (no patterns)',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  word: string;
}
