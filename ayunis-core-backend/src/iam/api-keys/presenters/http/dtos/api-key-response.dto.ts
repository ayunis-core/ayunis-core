import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the API key',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'CI bot',
  })
  name: string;

  @ApiProperty({
    description:
      'Public preview of the API key — the literal prefix plus the first characters of the secret. The full secret is shown only once at creation time.',
    example: 'ayk_live_abc123def456...',
  })
  prefixPreview: string;

  @ApiProperty({
    description: 'Expiration date of the API key, or null if it never expires',
    example: '2026-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    description:
      'ID of the user who created the key. May be null if that user has been deleted.',
    example: '550e8400-e29b-41d4-a716-446655440001',
    type: String,
    format: 'uuid',
    nullable: true,
  })
  createdByUserId: UUID | null;

  @ApiProperty({
    description: 'When the key was created',
    example: '2026-04-27T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;
}
