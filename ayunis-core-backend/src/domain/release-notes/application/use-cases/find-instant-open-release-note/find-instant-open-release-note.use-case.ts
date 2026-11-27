import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { UserReleaseNote } from 'src/domain/release-notes/application/models/user-release-note';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import { UnexpectedReleaseNoteError } from 'src/domain/release-notes/application/release-notes.errors';

/**
 * The note to open for the current user right away. Only the newest
 * instant-open note counts: once it is read, older unread ones stay in the
 * list instead of opening one after another.
 */
@Injectable()
export class FindInstantOpenReleaseNoteUseCase {
  private readonly logger = new Logger(FindInstantOpenReleaseNoteUseCase.name);

  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(): Promise<UserReleaseNote | null> {
    this.logger.log('Finding the release note to open right away');
    const { userId } = getRequiredUserContext(this.contextService);
    const newest =
      await this.releaseNotesRepository.findNewestInstantOpenForUser(userId);
    return newest?.unread ? newest : null;
  }
}
