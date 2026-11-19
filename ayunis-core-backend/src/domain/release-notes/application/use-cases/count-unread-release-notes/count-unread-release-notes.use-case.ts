import { Injectable } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import { UnexpectedReleaseNoteError } from 'src/domain/release-notes/application/release-notes.errors';
import { RELEASE_NOTES_LIST_LIMIT } from 'src/domain/release-notes/domain/release-notes.constants';

@Injectable()
export class CountUnreadReleaseNotesUseCase {
  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(): Promise<number> {
    const { userId } = getRequiredUserContext(this.contextService);
    return this.releaseNotesRepository.countUnread(
      userId,
      RELEASE_NOTES_LIST_LIMIT,
    );
  }
}
