import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationRecord } from './schema/notification.record';
import { LocalNotificationsRepository } from './local-notifications.repository';
import { NotificationMapper } from './mappers/notification.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationRecord])],
  providers: [LocalNotificationsRepository, NotificationMapper],
  exports: [LocalNotificationsRepository],
})
export class LocalNotificationsRepositoryModule {}
