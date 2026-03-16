import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
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

  // Margins arrive as JSON strings in multipart requests.
  // Validation is handled by parseMargins() in the controller.
  @ApiPropertyOptional({
    description: 'Margins for the first page in mm (JSON string)',
    type: String,
  })
  @IsOptional()
  firstPageMargins?: unknown;

  @ApiPropertyOptional({
    description: 'Margins for continuation pages in mm (JSON string)',
    type: String,
  })
  @IsOptional()
  continuationPageMargins?: unknown;

  @ApiPropertyOptional({
    description:
      'Set to true to remove the continuation page PDF. Ignored if a new continuationPagePdf file is uploaded.',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  removeContinuationPage?: boolean | string;
}
