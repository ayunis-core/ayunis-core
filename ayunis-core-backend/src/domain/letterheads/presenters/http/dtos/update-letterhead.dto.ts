import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PageMarginsDto } from './page-margins.dto';

export class UpdateLetterheadDto {
  @ApiPropertyOptional({
    description: 'Name of the letterhead',
    example: 'Stadtverwaltung Musterstadt — Neues Design',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the letterhead',
    example: 'Überarbeitetes Briefpapier 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Margins for the first page in mm',
    type: PageMarginsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageMarginsDto)
  firstPageMargins?: PageMarginsDto;

  @ApiPropertyOptional({
    description: 'Margins for continuation pages in mm',
    type: PageMarginsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageMarginsDto)
  continuationPageMargins?: PageMarginsDto;

  @ApiPropertyOptional({
    description:
      'Set to true to remove the continuation page PDF. Ignored if a new continuationPagePdf file is uploaded.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  clearContinuationPage?: boolean;
}
