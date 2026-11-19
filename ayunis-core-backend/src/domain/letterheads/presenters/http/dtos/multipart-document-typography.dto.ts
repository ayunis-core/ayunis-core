import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DOCUMENT_FONT_FAMILIES,
  MAX_DOCUMENT_FONT_SIZE_PT,
  MIN_DOCUMENT_FONT_SIZE_PT,
  type DocumentFontFamily,
} from 'src/domain/letterheads/domain/value-objects/document-typography';

export class MultipartDocumentTypographyDto {
  @ApiPropertyOptional({
    type: String,
    enum: [...DOCUMENT_FONT_FAMILIES, ''],
    description:
      'Font family. Send an empty string to inherit the organization default.',
  })
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsOptional()
  @IsIn(DOCUMENT_FONT_FAMILIES)
  fontFamily?: DocumentFontFamily | null;

  @ApiPropertyOptional({
    type: String,
    description: `Font size in points (${MIN_DOCUMENT_FONT_SIZE_PT}–${MAX_DOCUMENT_FONT_SIZE_PT}). Send an empty string to inherit the organization default.`,
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === '') return null;
    return typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : value;
  })
  @IsOptional()
  @IsInt()
  @Min(MIN_DOCUMENT_FONT_SIZE_PT)
  @Max(MAX_DOCUMENT_FONT_SIZE_PT)
  fontSizePt?: number | null;
}
