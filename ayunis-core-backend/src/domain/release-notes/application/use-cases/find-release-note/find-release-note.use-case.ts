import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { UserReleaseNote } from 'src/domain/release-notes/application/models/user-release-note';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import {
  ReleaseNoteNotFoundError,
  UnexpectedReleaseNoteError,
} from 'src/domain/release-notes/application/release-notes.errors';
import { FindReleaseNoteQuery } from './find-release-note.query';

/** A release note as the current user sees it; every user may read every note. */
@Injectable()
export class FindReleaseNoteUseCase {
  private readonly logger = new Logger(FindReleaseNoteUseCase.name);

  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(query: FindReleaseNoteQuery): Promise<UserReleaseNote> {
    this.logger.log({ releaseNoteId: query.id }, 'Finding release note');
    const { userId } = getRequiredUserContext(this.contextService);
    const releaseNote = await this.releaseNotesRepository.findOneForUser(
      userId,
      query.id,
    );
    if (!releaseNote) throw new ReleaseNoteNotFoundError(query.id);
    return releaseNote;
  }
}
