import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  contentTypeToExtension,
  sniffAllowedImageContentType,
} from 'src/common/util/content-type.util';
import {
  AdventCalendarDoorImageNotFoundError,
  AdventCalendarImageUnsupportedError,
} from 'src/domain/advent-calendar/application/advent-calendar.errors';
import { ADVENT_CALENDAR_IMAGE_PREFIX } from 'src/domain/advent-calendar/domain/advent-calendar.constants';
import type { AdventCalendarImage } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { AdventCalendarMediaType } from 'src/domain/advent-calendar/domain/advent-calendar-media';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { UploadSystemObjectCommand } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.command';
import { UploadSystemObjectUseCase } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.use-case';

export interface AdventCalendarImageDownload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  filename: string;
}

/** The stored door images, under `advent-calendar/<day>/`. */
@Injectable()
export class AdventCalendarImageService {
  private readonly logger = new Logger(AdventCalendarImageService.name);

  constructor(
    private readonly uploadSystemObject: UploadSystemObjectUseCase,
    private readonly downloadObject: DownloadObjectUseCase,
    private readonly deleteObject: DeleteObjectUseCase,
  ) {}

  /** Stores the image under a new key; the type is sniffed from its bytes. */
  async store(day: number, data: Buffer): Promise<AdventCalendarImage> {
    const contentType = sniffAllowedImageContentType(data);
    if (!contentType) throw new AdventCalendarImageUnsupportedError();
    const storageKey = `${ADVENT_CALENDAR_IMAGE_PREFIX}${day}/${randomUUID()}${contentTypeToExtension(contentType)}`;
    await this.uploadSystemObject.execute(
      new UploadSystemObjectCommand(storageKey, data, { contentType }),
    );
    return { type: AdventCalendarMediaType.IMAGE, storageKey, contentType };
  }

  async download(
    day: number,
    image: AdventCalendarImage,
  ): Promise<AdventCalendarImageDownload> {
    const stream = await this.downloadObject
      .execute(new DownloadObjectCommand(image.storageKey))
      .catch((error: unknown) => {
        // The storage error names the object key, which clients never see.
        if (error instanceof ObjectNotFoundError) {
          throw new AdventCalendarDoorImageNotFoundError(day);
        }
        throw error;
      });
    return {
      stream,
      contentType: image.contentType,
      filename: `advent-calendar-${day}${contentTypeToExtension(image.contentType)}`,
    };
  }

  /**
   * Deletes an image no door uses any more. Runs after the database write, so
   * a failure leaves an unused object behind rather than a door without its
   * image; it is logged.
   */
  async delete(image: AdventCalendarImage | null): Promise<void> {
    if (!image) return;
    try {
      await this.deleteObject.execute(
        new DeleteObjectCommand(image.storageKey),
      );
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return;
      this.logger.error(
        { err: error as Error, fileName: image.storageKey },
        'Could not delete unused advent calendar image',
      );
    }
  }
}
