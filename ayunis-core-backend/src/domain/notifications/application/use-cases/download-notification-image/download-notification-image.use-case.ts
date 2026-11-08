import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  contentTypeToExtension,
  isAllowedImageContentType,
} from 'src/common/util/content-type.util';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import {
  NotificationImageNotFoundError,
  NotificationNotFoundError,
  UnexpectedNotificationError,
} from 'src/domain/notifications/application/notifications.errors';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { DownloadNotificationImageQuery } from './download-notification-image.query';

export interface NotificationImageDownload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  filename: string;
}

/** The image of one of the current user's notifications. */
@Injectable()
export class DownloadNotificationImageUseCase {
  private readonly logger = new Logger(DownloadNotificationImageUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(
    query: DownloadNotificationImageQuery,
  ): Promise<NotificationImageDownload> {
    this.logger.log(
      { notificationId: query.notificationId },
      'Downloading notification image',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const notification = await this.notificationsRepository.findById(
      userId,
      query.notificationId,
    );
    if (!notification) {
      throw new NotificationNotFoundError(query.notificationId);
    }
    const { media } = notification;
    if (
      media?.type !== NotificationMediaType.IMAGE ||
      !isAllowedImageContentType(media.contentType)
    ) {
      throw new NotificationImageNotFoundError(query.notificationId);
    }
    const stream = await this.downloadObjectUseCase
      .execute(new DownloadObjectCommand(media.storageKey))
      .catch((error: unknown) => {
        // The storage error names the object key, which clients never see.
        if (error instanceof ObjectNotFoundError) {
          throw new NotificationImageNotFoundError(query.notificationId);
        }
        throw error;
      });
    return {
      stream,
      contentType: media.contentType,
      filename: `${notification.id}${contentTypeToExtension(media.contentType)}`,
    };
  }
}
