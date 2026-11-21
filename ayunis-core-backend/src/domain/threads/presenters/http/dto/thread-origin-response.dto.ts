import { ApiProperty } from '@nestjs/swagger';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';

export class ChatThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.CHAT] })
  kind: ThreadOriginKind.CHAT;
}

export class RoutineThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.ROUTINE] })
  kind: ThreadOriginKind.ROUTINE;

  @ApiProperty({
    type: String,
    description:
      'The routine whose run created this thread; null once the routine is deleted',
    format: 'uuid',
    nullable: true,
  })
  routineId: string | null;
}

export class NotificationThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.NOTIFICATION] })
  kind: ThreadOriginKind.NOTIFICATION;

  @ApiProperty({
    type: String,
    description:
      'The notification this chat was started about; null once the notification is deleted',
    format: 'uuid',
    nullable: true,
  })
  notificationId: string | null;
}

export class ReleaseNoteThreadOriginResponseDto {
  @ApiProperty({ enum: [ThreadOriginKind.RELEASE_NOTE] })
  kind: ThreadOriginKind.RELEASE_NOTE;

  @ApiProperty({
    type: String,
    description:
      'The release note this chat was started about; null once the release note is deleted',
    format: 'uuid',
    nullable: true,
  })
  releaseNoteId: string | null;
}

export type ThreadOriginResponseDto =
  | ChatThreadOriginResponseDto
  | RoutineThreadOriginResponseDto
  | NotificationThreadOriginResponseDto
  | ReleaseNoteThreadOriginResponseDto;
