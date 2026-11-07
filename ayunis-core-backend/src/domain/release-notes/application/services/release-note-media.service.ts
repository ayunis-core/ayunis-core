import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  contentTypeToExtension,
  sniffAllowedImageContentType,
} from 'src/common/util/content-type.util';
import type {
  NotificationImage,
  NotificationMedia,
} from 'src/domain/notifications/domain/notification-media';
import {
  NotificationMediaType,
  notificationMediaViolation,
} from 'src/domain/notifications/domain/notification-media';
import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';
import { AnnouncableFeed } from 'src/domain/release-notes/application/ports/announcable-feed.port';
import { imageSourcePath } from 'src/domain/release-notes/application/util/release-note-content.helper';
import type { ReleaseNote } from 'src/domain/release-notes/domain/release-note.entity';
import { RELEASE_NOTE_IMAGE_PREFIX } from 'src/domain/release-notes/domain/release-notes.constants';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { ListObjectsCommand } from 'src/domain/storage/application/use-cases/list-objects/list-objects.command';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { UploadSystemObjectCommand } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.command';
import { UploadSystemObjectUseCase } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.use-case';

export interface ResolvedReleaseNoteMedia {
  readonly media: NotificationMedia | null;
  /** Set exactly when the media is a stored image. */
  readonly imageSourcePath: string | null;
}

const NO_MEDIA: ResolvedReleaseNoteMedia = {
  media: null,
  imageSourcePath: null,
};

/**
 * The media of release notes and the lifecycle of their stored images. Media
 * that breaks the notification media rules is left out and logged, since
 * notifications copy a note's media without `CreateNotificationUseCase`.
 */
@Injectable()
export class ReleaseNoteMediaService {
  private readonly logger = new Logger(ReleaseNoteMediaService.name);

  constructor(
    private readonly feed: AnnouncableFeed,
    private readonly uploadSystemObject: UploadSystemObjectUseCase,
    private readonly listObjects: ListObjectsUseCase,
    private readonly deleteObject: DeleteObjectUseCase,
  ) {}

  /** A usable Loom video wins over an image when a note has both. */
  async resolve(
    note: AnnouncableReleaseNote,
    stored: ReleaseNote | null,
  ): Promise<ResolvedReleaseNoteMedia> {
    const video =
      note.mediaLink &&
      this.allowed(note, {
        type: NotificationMediaType.LOOM,
        url: note.mediaLink,
      });
    if (video) return { media: video, imageSourcePath: null };
    const path = note.imageSrc ? imageSourcePath(note.imageSrc) : null;
    if (!path) return NO_MEDIA;
    if (stored?.media && stored.imageSourcePath === path) {
      return { media: stored.media, imageSourcePath: path };
    }
    const image = await this.storeImage(note, path);
    const media = image && this.allowed(note, image);
    return media ? { media, imageSourcePath: path } : NO_MEDIA;
  }

  /**
   * Deletes every stored release-note image none of the kept notes uses: those
   * of replaced images and deleted notes, and any left behind by a failed
   * sync. Failures are logged; the next sync tries again.
   */
  async removeUnusedImages(kept: ReleaseNote[]): Promise<void> {
    const used = new Set(
      kept.flatMap(({ media }) =>
        media?.type === NotificationMediaType.IMAGE ? [media.storageKey] : [],
      ),
    );
    let stored: string[];
    try {
      stored = await this.listObjects.execute(
        new ListObjectsCommand(RELEASE_NOTE_IMAGE_PREFIX),
      );
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Could not list stored release-note images',
      );
      return;
    }
    for (const key of stored.filter((name) => !used.has(name))) {
      await this.deleteImage(key);
    }
  }

  private async storeImage(
    note: AnnouncableReleaseNote,
    path: string,
  ): Promise<NotificationImage | null> {
    const download = await this.feed.downloadImage(note.imageSrc);
    if (download.status === 'rejected') {
      this.logMediaLeftOut(note, download.reason);
      return null;
    }
    const contentType = sniffAllowedImageContentType(download.data);
    if (!contentType) {
      this.logMediaLeftOut(note, 'the image is not a supported type');
      return null;
    }
    const pathHash = createHash('sha256').update(path).digest('hex');
    const storageKey = `${RELEASE_NOTE_IMAGE_PREFIX}${note.id}/${pathHash.slice(0, 16)}${contentTypeToExtension(contentType)}`;
    await this.uploadSystemObject.execute(
      new UploadSystemObjectCommand(storageKey, download.data, { contentType }),
    );
    return { type: NotificationMediaType.IMAGE, storageKey, contentType };
  }

  private allowed(
    note: AnnouncableReleaseNote,
    media: NotificationMedia,
  ): NotificationMedia | null {
    const violation = notificationMediaViolation(media);
    if (!violation) return media;
    this.logMediaLeftOut(note, violation);
    return null;
  }

  private logMediaLeftOut(note: AnnouncableReleaseNote, reason: string): void {
    this.logger.warn(
      { announcableId: note.id, reason },
      'Storing release note without its media',
    );
  }

  private async deleteImage(key: string): Promise<void> {
    try {
      await this.deleteObject.execute(new DeleteObjectCommand(key));
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return;
      this.logger.error(
        { err: error as Error, fileName: key },
        'Could not delete unused release-note image',
      );
    }
  }
}
