import { ApiProperty } from '@nestjs/swagger';

export class SourceUploadSessionResponseDto {
  @ApiProperty({
    description:
      'Upload id. Used for the transfer endpoints under /source-uploads and for completing the upload on its target.',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description:
      'True when the file must be transferred as an S3 multipart upload (part URLs signed per part); false for a single signed PUT.',
  })
  multipart: boolean;

  @ApiProperty({
    description: 'Size of every part except the last, in bytes',
    example: 8388608,
  })
  partSizeBytes: number;

  @ApiProperty({
    description: 'The transfer must be completed before this time',
    example: '2026-01-15T12:00:00.000Z',
  })
  expiresAt: string;
}
