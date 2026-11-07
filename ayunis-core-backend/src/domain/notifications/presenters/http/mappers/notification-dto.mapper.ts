import { Injectable } from '@nestjs/common';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { Notification } from 'src/domain/notifications/domain/notification.entity';
import type {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from 'src/domain/notifications/presenters/http/dto/notification-response.dto';

@Injectable()
export class NotificationDtoMapper {
  toDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      headline: notification.headline,
      subheadline: notification.subheadline,
      body: notification.body,
      routineId: notification.routineId,
      routineThreadId: notification.routineThreadId,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }

  toPaginatedDto(
    page: Paginated<Notification>,
  ): PaginatedNotificationsResponseDto {
    return {
      data: page.data.map((notification) => this.toDto(notification)),
      pagination: {
        limit: page.limit,
        offset: page.offset,
        total: page.total,
      },
    };
  }
}
