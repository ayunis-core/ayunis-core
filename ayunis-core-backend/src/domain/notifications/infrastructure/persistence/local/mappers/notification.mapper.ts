import { Injectable } from '@nestjs/common';
import { Notification } from 'src/domain/notifications/domain/notification.entity';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
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
      media: mediaToDomain(record),
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
    record.mediaType = domain.media?.type ?? null;
    record.mediaUrl =
      domain.media?.type === NotificationMediaType.LOOM
        ? domain.media.url
        : null;
    record.mediaStorageKey =
      domain.media?.type === NotificationMediaType.IMAGE
        ? domain.media.storageKey
        : null;
    record.mediaContentType =
      domain.media?.type === NotificationMediaType.IMAGE
        ? domain.media.contentType
        : null;
    record.routineId = domain.routineId;
    record.routineThreadId = domain.routineThreadId;
    record.readAt = domain.readAt;
    record.createdAt = domain.createdAt;
    return record;
  }
}

function mediaToDomain(record: NotificationRecord): NotificationMedia | null {
  if (record.mediaType === NotificationMediaType.LOOM && record.mediaUrl) {
    return { type: NotificationMediaType.LOOM, url: record.mediaUrl };
  }
  if (
    record.mediaType === NotificationMediaType.IMAGE &&
    record.mediaStorageKey &&
    record.mediaContentType
  ) {
    return {
      type: NotificationMediaType.IMAGE,
      storageKey: record.mediaStorageKey,
      contentType: record.mediaContentType,
    };
  }
  return null;
}
