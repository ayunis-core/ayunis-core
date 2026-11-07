import { Injectable } from '@nestjs/common';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';
import { ReleaseNoteRecord } from 'src/domain/release-notes/infrastructure/persistence/local/schema/release-note.record';

@Injectable()
export class ReleaseNoteMapper {
  toDomain(record: ReleaseNoteRecord): ReleaseNote {
    return new ReleaseNote({
      id: record.id,
      announcableId: record.announcableId,
      headline: record.headline,
      body: record.body,
      media: mediaToDomain(record),
      imageSourcePath: record.imageSourcePath,
      lastUpdateOn: record.lastUpdateOn,
    });
  }

  toRecord(domain: ReleaseNote): ReleaseNoteRecord {
    const { media } = domain;
    const record = new ReleaseNoteRecord();
    record.id = domain.id;
    record.announcableId = domain.announcableId;
    record.headline = domain.headline;
    record.body = domain.body;
    record.mediaType = media?.type ?? null;
    record.mediaUrl =
      media?.type === NotificationMediaType.LOOM ? media.url : null;
    record.mediaStorageKey =
      media?.type === NotificationMediaType.IMAGE ? media.storageKey : null;
    record.mediaContentType =
      media?.type === NotificationMediaType.IMAGE ? media.contentType : null;
    record.imageSourcePath = domain.imageSourcePath;
    record.lastUpdateOn = domain.lastUpdateOn;
    return record;
  }
}

function mediaToDomain(record: ReleaseNoteRecord): NotificationMedia | null {
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
