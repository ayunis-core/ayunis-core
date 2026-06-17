import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
    type: String,
    description: 'JSON string of { top, bottom, left, right } margins in mm',
  })
  @IsOptional()
  firstPageMargins?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'JSON string of { top, bottom, left, right } margins in mm',
  })
  @IsOptional()
  continuationPageMargins?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Set to "true" to remove the continuation page PDF. Ignored if a new continuationPagePdf file is uploaded.',
  })
  @IsOptional()
  removeContinuationPage?: string;
}
