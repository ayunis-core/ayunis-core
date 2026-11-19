import { Module } from '@nestjs/common';
import { StorageModule } from 'src/domain/storage/storage.module';
import { NotificationsRepository } from './application/ports/notifications.repository';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications/count-unread-notifications.use-case';
import { CreateNotificationUseCase } from './application/use-cases/create-notification/create-notification.use-case';
import { DownloadNotificationImageUseCase } from './application/use-cases/download-notification-image/download-notification-image.use-case';
import { DeleteExpiredNotificationsUseCase } from './application/use-cases/delete-expired-notifications/delete-expired-notifications.use-case';
import { FindMyNotificationsUseCase } from './application/use-cases/find-my-notifications/find-my-notifications.use-case';
import { FindNotificationUseCase } from './application/use-cases/find-notification/find-notification.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read/mark-notification-read.use-case';
import { LocalNotificationsRepositoryModule } from './infrastructure/persistence/local/local-notifications-repository.module';
import { LocalNotificationsRepository } from './infrastructure/persistence/local/local-notifications.repository';
import { NotificationDtoMapper } from './presenters/http/mappers/notification-dto.mapper';
import { NotificationsController } from './presenters/http/notifications.controller';

@Module({
  imports: [LocalNotificationsRepositoryModule, StorageModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NotificationsRepository,
      useExisting: LocalNotificationsRepository,
    },
    CreateNotificationUseCase,
    FindNotificationUseCase,
    FindMyNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    DeleteExpiredNotificationsUseCase,
    DownloadNotificationImageUseCase,
    NotificationDtoMapper,
  ],
  exports: [
    CreateNotificationUseCase,
    FindNotificationUseCase,
    DeleteExpiredNotificationsUseCase,
  ],
})
export class NotificationsModule {}
