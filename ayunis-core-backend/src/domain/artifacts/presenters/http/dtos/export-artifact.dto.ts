import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ExportFormatDto {
  DOCX = 'docx',
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
}

export class ExportArtifactQueryDto {
  @ApiProperty({
    description: 'Export format',
    enum: ExportFormatDto,
    example: ExportFormatDto.DOCX,
  })
  @IsEnum(ExportFormatDto)
  format: ExportFormatDto;
}
