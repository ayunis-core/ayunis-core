import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { isAllowedImageContentType } from 'src/common/util/content-type.util';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import {
  NotificationInvalidError,
  NotificationLimitReachedError,
  UnexpectedNotificationError,
} from 'src/domain/notifications/application/notifications.errors';
import { Notification } from 'src/domain/notifications/domain/notification.entity';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import {
  LOOM_EMBED_URL_PREFIX,
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_HEADLINE_MAX_LENGTH,
  NOTIFICATION_MEDIA_URL_MAX_LENGTH,
  NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
} from 'src/domain/notifications/domain/notifications.constants';
import { CreateNotificationCommand } from './create-notification.command';

@Injectable()
export class CreateNotificationUseCase {
  private readonly logger = new Logger(CreateNotificationUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(command: CreateNotificationCommand): Promise<Notification> {
    this.logger.log(
      {
        userId: command.userId,
        type: command.type,
        routineId: command.routineId,
        routineThreadId: command.routineThreadId,
      },
      'Creating notification',
    );
    const notification = new Notification({
      userId: command.userId,
      orgId: command.orgId,
      type: command.type,
      headline: requiredText(
        'headline',
        command.headline,
        NOTIFICATION_HEADLINE_MAX_LENGTH,
      ),
      subheadline:
        command.subheadline === null
          ? null
          : requiredText(
              'subheadline',
              command.subheadline,
              NOTIFICATION_SUBHEADLINE_MAX_LENGTH,
            ),
      body: requiredText('body', command.body, NOTIFICATION_BODY_MAX_LENGTH),
      media: command.media && validMedia(command.media),
      routineId: command.routineId,
      routineThreadId: command.routineThreadId,
    });
    if (command.limitPerRoutineThread === undefined) {
      return this.notificationsRepository.create(notification);
    }
    return this.createWithinLimit(
      notification,
      command.routineThreadId,
      command.limitPerRoutineThread,
    );
  }

  private async createWithinLimit(
    notification: Notification,
    routineThreadId: UUID | null,
    limit: number,
  ): Promise<Notification> {
    if (!routineThreadId) {
      throw new NotificationInvalidError(
        'a limit needs a routine thread to count against',
      );
    }
    const created =
      await this.notificationsRepository.createWithinRoutineThreadLimit(
        Object.assign(notification, { routineThreadId }),
        limit,
      );
    if (!created) {
      throw new NotificationLimitReachedError(limit, { routineThreadId });
    }
    return created;
  }
}

function requiredText(field: string, value: string, maxLength: number): string {
  const text = value.trim();
  if (text.length === 0) {
    throw new NotificationInvalidError(`${field} is empty`);
  }
  if (text.length > maxLength) {
    throw new NotificationInvalidError(
      `${field} is longer than ${maxLength} characters`,
    );
  }
  return text;
}

function validMedia(media: NotificationMedia): NotificationMedia {
  if (media.type === NotificationMediaType.LOOM) {
    if (!media.url.startsWith(LOOM_EMBED_URL_PREFIX)) {
      throw new NotificationInvalidError(
        `a Loom video needs a URL starting with ${LOOM_EMBED_URL_PREFIX}`,
      );
    }
    if (media.url.length > NOTIFICATION_MEDIA_URL_MAX_LENGTH) {
      throw new NotificationInvalidError(
        `the Loom URL is longer than ${NOTIFICATION_MEDIA_URL_MAX_LENGTH} characters`,
      );
    }
    return media;
  }
  if (media.storageKey.trim().length === 0) {
    throw new NotificationInvalidError('an image needs a storage key');
  }
  if (!isAllowedImageContentType(media.contentType)) {
    throw new NotificationInvalidError(
      `images of type ${media.contentType} are not supported`,
    );
  }
  return media;
}
