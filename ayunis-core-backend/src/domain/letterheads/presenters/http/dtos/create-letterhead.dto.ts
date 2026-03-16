import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageMarginsDto } from './page-margins.dto';

export class CreateLetterheadDto {
  @ApiProperty({
    description: 'Name of the letterhead',
    example: 'Stadtverwaltung Musterstadt',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the letterhead (used by AI for context)',
    example: 'Offizielles Briefpapier der Stadtverwaltung',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Margins for the first page in mm',
    type: PageMarginsDto,
    default: { top: 20, bottom: 20, left: 20, right: 20 },
  })
  @ValidateNested()
  @Type(() => PageMarginsDto)
  firstPageMargins: PageMarginsDto;

  @ApiProperty({
    description: 'Margins for continuation pages in mm',
    type: PageMarginsDto,
    default: { top: 20, bottom: 20, left: 20, right: 20 },
  })
  @ValidateNested()
  @Type(() => PageMarginsDto)
  continuationPageMargins: PageMarginsDto;
}
