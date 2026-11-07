import { Injectable } from '@nestjs/common';
import { Notification } from 'src/domain/notifications/domain/notification.entity';
import { NotificationRecord } from 'src/domain/notifications/infrastructure/persistence/local/schema/notification.record';

@Injectable()
export class NotificationMapper {
  toDomain(record: NotificationRecord): Notification {
    return new Notification({
      id: record.id,
      userId: record.userId,
      orgId: record.orgId,
      type: record.type,
      headline: record.headline,
      subheadline: record.subheadline,
      body: record.body,
      routineId: record.routineId,
      routineThreadId: record.routineThreadId,
      readAt: record.readAt,
      createdAt: record.createdAt,
    });
  }

  toRecord(domain: Notification): NotificationRecord {
    const record = new NotificationRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.orgId = domain.orgId;
    record.type = domain.type;
    record.headline = domain.headline;
    record.subheadline = domain.subheadline;
    record.body = domain.body;
    record.routineId = domain.routineId;
    record.routineThreadId = domain.routineThreadId;
    record.readAt = domain.readAt;
    record.createdAt = domain.createdAt;
    return record;
  }
}
