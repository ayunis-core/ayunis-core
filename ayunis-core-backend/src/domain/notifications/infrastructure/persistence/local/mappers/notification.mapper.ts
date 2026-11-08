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
      releaseNoteId: record.releaseNoteId,
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
    Object.assign(record, this.mediaToRecord(domain.media));
    record.routineId = domain.routineId;
    record.routineThreadId = domain.routineThreadId;
    record.releaseNoteId = domain.releaseNoteId;
    record.readAt = domain.readAt;
    record.createdAt = domain.createdAt;
    return record;
  }

  mediaToRecord(
    media: NotificationMedia | null,
  ): Pick<
    NotificationRecord,
    'mediaType' | 'mediaUrl' | 'mediaStorageKey' | 'mediaContentType'
  > {
    return {
      mediaType: media?.type ?? null,
      mediaUrl: media?.type === NotificationMediaType.LOOM ? media.url : null,
      mediaStorageKey:
        media?.type === NotificationMediaType.IMAGE ? media.storageKey : null,
      mediaContentType:
        media?.type === NotificationMediaType.IMAGE ? media.contentType : null,
    };
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
