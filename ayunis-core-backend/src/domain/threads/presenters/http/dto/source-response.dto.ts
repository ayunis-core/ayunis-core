import { ApiProperty } from '@nestjs/swagger';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';

export class SourceResponseDto {
  @ApiProperty({ description: 'Unique identifier for the source' })
  id: string;

  @ApiProperty({ description: 'Thread ID this source belongs to' })
  threadId?: string;

  @ApiProperty({ description: 'User ID who owns this source' })
  userId: string;

  @ApiProperty({ description: 'Type of source', enum: SourceType })
  type: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

export class FileSourceResponseDto extends SourceResponseDto {
  @ApiProperty({ description: 'MIME type of the file' })
  fileType: string;

  @ApiProperty({ description: 'Size of the file in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Path to the stored file' })
  filePath: string;
}

export class UrlSourceResponseDto extends SourceResponseDto {
  @ApiProperty({ description: 'URL of the source' })
  url: string;
}
