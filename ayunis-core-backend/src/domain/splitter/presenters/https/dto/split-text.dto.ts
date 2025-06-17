import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';

export class SplitterMetadataDto {
  @ApiPropertyOptional({
    description: 'Number of text chunks or lines per segment',
    type: Number,
    example: 1000,
  })
  @IsOptional()
  chunkSize?: number;

  @ApiPropertyOptional({
    description: 'Number of characters to overlap between chunks',
    type: Number,
    example: 200,
  })
  @IsOptional()
  chunkOverlap?: number;

  @ApiPropertyOptional({
    description: 'For CSV files: whether to preserve header in each chunk',
    type: Boolean,
    default: true,
  })
  @IsOptional()
  preserveHeader?: boolean;

  @ApiPropertyOptional({
    description: 'For CSV files: whether to skip blank lines',
    type: Boolean,
    default: true,
  })
  @IsOptional()
  skipBlankLines?: boolean;

  @ApiPropertyOptional({
    description:
      'For CSV files: whether to handle quoted fields that span multiple lines',
    type: Boolean,
    default: true,
  })
  @IsOptional()
  detectQuotes?: boolean;

  @ApiPropertyOptional({
    description:
      'For CSV files: custom header row to use instead of first line',
    type: String,
  })
  @IsOptional()
  @IsString()
  headerRow?: string;
}

export class SplitTextDto {
  @ApiProperty({
    description: 'The text content to split',
    type: String,
    example: 'This is a sample text that needs to be split into chunks...',
  })
  @IsNotEmpty()
  @IsString()
  text: string;

  @ApiProperty({
    description: 'The splitter provider to use',
    enum: SplitterProvider,
    example: SplitterProvider.RECURSIVE,
  })
  @IsNotEmpty()
  @IsEnum(SplitterProvider)
  provider: SplitterProvider;

  @ApiPropertyOptional({
    description: 'Metadata for customizing the splitting behavior',
    type: SplitterMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SplitterMetadataDto)
  metadata?: SplitterMetadataDto;
}
