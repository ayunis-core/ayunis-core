import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

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

  @ApiProperty({
    description: 'Version number to export; defaults to the current version',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  versionNumber?: number;
}
