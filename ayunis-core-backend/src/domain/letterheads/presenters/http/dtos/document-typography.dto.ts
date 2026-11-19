import {
  ApiProperty,
  ApiPropertyOptional,
  type ApiPropertyOptions,
} from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DOCUMENT_FONT_FAMILIES,
  MAX_DOCUMENT_FONT_SIZE_PT,
  MIN_DOCUMENT_FONT_SIZE_PT,
  type DocumentFontFamily,
} from 'src/domain/letterheads/domain/value-objects/document-typography';

const fontFamilySchema = {
  enum: [...DOCUMENT_FONT_FAMILIES],
  enumName: 'DocumentFontFamily',
  nullable: true,
};

const fontSizeSchema = {
  type: 'integer',
  minimum: MIN_DOCUMENT_FONT_SIZE_PT,
  maximum: MAX_DOCUMENT_FONT_SIZE_PT,
  nullable: true,
} satisfies ApiPropertyOptions;

export class DocumentTypographyDto {
  @ApiProperty(fontFamilySchema)
  fontFamily: DocumentFontFamily | null;

  @ApiProperty(fontSizeSchema)
  fontSizePt: number | null;
}

export class UpdateDocumentDefaultsDto {
  @ApiPropertyOptional(fontFamilySchema)
  @IsOptional()
  @IsIn(DOCUMENT_FONT_FAMILIES)
  fontFamily?: DocumentFontFamily | null;

  @ApiPropertyOptional(fontSizeSchema)
  @IsOptional()
  @IsInt()
  @Min(MIN_DOCUMENT_FONT_SIZE_PT)
  @Max(MAX_DOCUMENT_FONT_SIZE_PT)
  fontSizePt?: number | null;
}
