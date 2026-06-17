import { ApiProperty } from '@nestjs/swagger';

export class GeneratedImageUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL to access the generated image',
  })
  url: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the URL expires',
    example: '2026-04-10T12:00:00.000Z',
  })
  expiresAt: string;
}
