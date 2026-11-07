import { Check, Column, Entity } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import {
  NOTIFICATION_HEADLINE_MAX_LENGTH,
  NOTIFICATION_MEDIA_URL_MAX_LENGTH,
} from 'src/domain/notifications/domain/notifications.constants';

/** The media columns mirror those of a notification, which copies them. */
@Entity({ name: 'release_notes' })
@Check(
  `("mediaType" IS NULL AND "mediaUrl" IS NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL) OR ("mediaType" = 'loom' AND "mediaUrl" IS NOT NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL) OR ("mediaType" = 'image' AND "mediaUrl" IS NULL AND "mediaStorageKey" IS NOT NULL AND "mediaContentType" IS NOT NULL)`,
)
export class ReleaseNoteRecord extends BaseRecord {
  @Column({ type: 'varchar', unique: true })
  announcableId: string;

  @Column({ type: 'varchar', length: NOTIFICATION_HEADLINE_MAX_LENGTH })
  headline: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: NotificationMediaType, nullable: true })
  mediaType: NotificationMediaType | null;

  @Column({
    type: 'varchar',
    length: NOTIFICATION_MEDIA_URL_MAX_LENGTH,
    nullable: true,
  })
  mediaUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaStorageKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaContentType: string | null;

  @Column({ type: 'text', nullable: true })
  imageSourcePath: string | null;

  @Column({ type: 'varchar' })
  lastUpdateOn: string;
}
