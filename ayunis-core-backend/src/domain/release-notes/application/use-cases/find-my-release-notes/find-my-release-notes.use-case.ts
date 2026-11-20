import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { UserReleaseNote } from 'src/domain/release-notes/application/models/user-release-note';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import { UnexpectedReleaseNoteError } from 'src/domain/release-notes/application/release-notes.errors';
import { RELEASE_NOTES_LIST_LIMIT } from 'src/domain/release-notes/domain/release-notes.constants';

/** The newest release notes with the current user's read state. */
@Injectable()
export class FindMyReleaseNotesUseCase {
  private readonly logger = new Logger(FindMyReleaseNotesUseCase.name);

  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(): Promise<UserReleaseNote[]> {
    this.logger.log('Finding release notes');
    const { userId } = getRequiredUserContext(this.contextService);
    return this.releaseNotesRepository.findNewestForUser(
      userId,
      RELEASE_NOTES_LIST_LIMIT,
    );
  }
}
