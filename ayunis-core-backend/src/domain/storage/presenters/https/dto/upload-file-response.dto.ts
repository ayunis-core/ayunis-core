import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'Name of the uploaded object',
    example: '1711365678123-user-upload.png',
  })
  objectName: string;

  @ApiProperty({
    description: 'Size of the uploaded file in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'ETag of the uploaded object',
    example: 'd41d8cd98f00b204e9800998ecf8427e',
  })
  etag: string;

  @ApiProperty({
    description: 'Content type of the uploaded file',
    example: 'image/png',
    required: false,
  })
  contentType?: string;

  @ApiProperty({
    description: 'Last modified date of the uploaded object',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  lastModified?: Date;
}
