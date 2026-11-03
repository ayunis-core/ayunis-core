import { ApiProperty } from '@nestjs/swagger';

export class SignedUploadUrlResponseDto {
  @ApiProperty({
    description: 'Pre-signed URL the browser PUTs the bytes to',
  })
  url: string;

  @ApiProperty({
    description: 'The URL stops working after this time; sign again to retry',
    example: '2026-01-15T12:00:00.000Z',
  })
  expiresAt: string;
}
