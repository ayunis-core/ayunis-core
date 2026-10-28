import { ApiProperty } from '@nestjs/swagger';

/**
 * Thread fields that both the list and the single-thread response carry.
 * Shared through inheritance so the two DTOs cannot drift apart.
 */
export class ThreadMetadataResponseDto {
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:30:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description:
      'Whether the thread is in anonymous mode (PII redaction enabled)',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    type: String,
    description: 'The workspace this thread is filed under, if any',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  workspaceId: string | null;
}
