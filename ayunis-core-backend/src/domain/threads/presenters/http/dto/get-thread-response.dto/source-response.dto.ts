import { ApiProperty } from '@nestjs/swagger';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import {
  SourceType,
  TextType,
  DataType,
  FileType,
} from 'src/domain/sources/domain/source-type.enum';

export abstract class SourceResponseDto {
  @ApiProperty({ description: 'Unique identifier for the source' })
  id: string;

  @ApiProperty({ description: 'Thread ID this source belongs to' })
  threadId?: string;

  @ApiProperty({ description: 'Name of the source' })
  name: string;

  @ApiProperty({ description: 'Type of source', enum: SourceType })
  type: string;

  @ApiProperty({ description: 'Creator of the source', enum: SourceCreator })
  createdBy: SourceCreator;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

export class FileSourceResponseDto extends SourceResponseDto {
  @ApiProperty({ description: 'Type of text', enum: TextType })
  textType: TextType;

  @ApiProperty({ description: 'Type of file', enum: FileType })
  fileType: FileType;
}

export class UrlSourceResponseDto extends SourceResponseDto {
  @ApiProperty({ description: 'Type of text', enum: TextType })
  textType: TextType;

  @ApiProperty({ description: 'URL of the source' })
  url: string;
}

export abstract class DataSourceResponseDto extends SourceResponseDto {
  @ApiProperty({ description: 'Type of data', enum: DataType })
  dataType: DataType;

  @ApiProperty({
    description: 'Data content',
    type: 'object',
    additionalProperties: true,
  })
  data: object;
}

export class CSVDataSourceResponseDto extends DataSourceResponseDto {
  @ApiProperty({
    description: 'CSV data with headers and rows',
    type: 'object',
    properties: {
      headers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Column headers',
      },
      rows: {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'string' },
        },
        description: 'Data rows',
      },
    },
    additionalProperties: false,
  })
  declare data: {
    headers: string[];
    rows: string[][];
  };
}
