import { ApiProperty } from '@nestjs/swagger';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ThreadType } from 'src/domain/threads/domain/thread-type.enum';

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
    enum: ModelMode,
    enumName: 'ModelMode',
    nullable: true,
    description:
      'Mode the chat was started with; null when an individual model was chosen',
  })
  mode: ModelMode | null;

  @ApiProperty({
    type: String,
    description: 'The workspace this thread is filed under, if any',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  workspaceId: string | null;

  @ApiProperty({
    enum: ThreadType,
    enumName: 'ThreadType',
    description:
      'Whether a user started the thread or a routine run created it',
  })
  type: ThreadType;

  @ApiProperty({
    type: String,
    description:
      'The routine whose run created this thread; null for chats and once the routine is deleted',
    format: 'uuid',
    nullable: true,
  })
  routineId: string | null;

  @ApiProperty({
    type: String,
    description:
      'The notification this chat was started about; null for other chats and once the notification is deleted',
    format: 'uuid',
    nullable: true,
  })
  sourceNotificationId: string | null;
}
