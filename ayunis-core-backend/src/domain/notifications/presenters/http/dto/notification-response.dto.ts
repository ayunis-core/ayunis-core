import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: NotificationType,
    enumName: 'NotificationType',
    description:
      '`routine`: sent by a routine run; `routine_error`: a routine run failed',
  })
  type: NotificationType;

  @ApiProperty()
  headline: string;

  @ApiProperty()
  subheadline: string;

  @ApiProperty({ description: 'Markdown; may contain links' })
  body: string;

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

export class UnreadNotificationCountResponseDto {
  @ApiProperty({ example: 3 })
  count: number;
}
