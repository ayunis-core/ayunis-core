import type { UUID } from 'node:crypto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import type { LetterheadSampleLanguage } from 'src/domain/artifacts/application/use-cases/render-letterhead-sample/render-letterhead-sample.use-case';
import { MultipartDocumentTypographyDto } from './multipart-document-typography.dto';

export class PreviewLetterheadDto extends MultipartDocumentTypographyDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  letterheadId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  firstPagePdf?: never;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  continuationPagePdf?: never;

  @ApiProperty({
    description: 'First-page margins in millimeters, as a JSON string',
  })
  @IsString()
  @IsNotEmpty()
  firstPageMargins: string;

  @ApiProperty({
    description: 'Continuation margins in millimeters, as a JSON string',
  })
  @IsString()
  @IsNotEmpty()
  continuationPageMargins: string;

  @ApiPropertyOptional({ type: String, enum: ['true'] })
  @IsOptional()
  @IsIn(['true'])
  removeContinuationPage?: 'true';

  @ApiPropertyOptional({ type: String, enum: ['de', 'en'] })
  @IsOptional()
  @IsIn(['de', 'en'])
  language?: LetterheadSampleLanguage;
}
