import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

export class NotificationMediaResponseDto {
  @ApiProperty({
    enum: NotificationMediaType,
    enumName: 'NotificationMediaType',
  })
  type: NotificationMediaType;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The Loom embed URL of a Loom video; null for an image, which `GET /notifications/{id}/image` serves',
  })
  url: string | null;
}

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: NotificationType,
    enumName: 'NotificationType',
    description:
      '`routine`: sent by a routine run; `routine_error`: a routine run failed; `release_note`: a release note of Ayunis',
  })
  type: NotificationType;

  @ApiProperty()
  headline: string;

  @ApiProperty({ type: String, nullable: true })
  subheadline: string | null;

  @ApiProperty({ description: 'Markdown; may contain links' })
  body: string;

  @ApiProperty({ type: NotificationMediaResponseDto, nullable: true })
  media: NotificationMediaResponseDto | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The routine that sent it; null once the routine is deleted',
  })
  routineId: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'The routine thread of the run that sent it; null for none or once the thread is deleted',
  })
  routineThreadId: string | null;

  @ApiProperty({ type: Date, nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class UnreadNotificationTypeCountResponseDto {
  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type: NotificationType;

  @ApiProperty({ example: 2 })
  count: number;
}

export class UnreadNotificationCountResponseDto {
  @ApiProperty({ example: 3, description: 'All unread notifications' })
  count: number;

  @ApiProperty({
    type: [UnreadNotificationTypeCountResponseDto],
    description: 'Unread notifications per type; only types with any',
  })
  byType: UnreadNotificationTypeCountResponseDto[];
}
