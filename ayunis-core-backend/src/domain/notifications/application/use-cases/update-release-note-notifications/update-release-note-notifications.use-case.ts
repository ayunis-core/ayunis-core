import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { UnexpectedNotificationError } from 'src/domain/notifications/application/notifications.errors';
import { UpdateReleaseNoteNotificationsCommand } from './update-release-note-notifications.command';

/**
 * Shows an edited release note in every notification already sent for it.
 * Creates none and keeps their read state. Returns how many were updated.
 */
@Injectable()
export class UpdateReleaseNoteNotificationsUseCase {
  private readonly logger = new Logger(
    UpdateReleaseNoteNotificationsUseCase.name,
  );

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(
    command: UpdateReleaseNoteNotificationsCommand,
  ): Promise<number> {
    this.logger.log(
      { releaseNoteId: command.releaseNoteId },
      'Updating release note notifications',
    );
    return this.notificationsRepository.updateReleaseNoteNotifications(command);
  }
}
