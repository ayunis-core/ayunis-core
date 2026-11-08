import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { UnexpectedNotificationError } from 'src/domain/notifications/application/notifications.errors';
import { NotifyUsersOfReleaseNoteCommand } from './notify-users-of-release-note.command';

/**
 * Sends a release note to every user there is right now, except those of
 * archived orgs, in one statement however many users there are. Returns how
 * many notifications were created.
 */
@Injectable()
export class NotifyUsersOfReleaseNoteUseCase {
  private readonly logger = new Logger(NotifyUsersOfReleaseNoteUseCase.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedNotificationError)
  async execute(command: NotifyUsersOfReleaseNoteCommand): Promise<number> {
    this.logger.log(
      { releaseNoteId: command.releaseNoteId },
      'Notifying users of release note',
    );
    return this.notificationsRepository.createReleaseNoteNotifications(
      command,
      new Date(),
    );
  }
}
