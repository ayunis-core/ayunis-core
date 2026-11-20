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
import { MarkReleaseNoteReadCommand } from './mark-release-note-read.command';

@Injectable()
export class MarkReleaseNoteReadUseCase {
  private readonly logger = new Logger(MarkReleaseNoteReadUseCase.name);

  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(command: MarkReleaseNoteReadCommand): Promise<UserReleaseNote> {
    this.logger.log({ releaseNoteId: command.id }, 'Marking release note read');
    const { userId } = getRequiredUserContext(this.contextService);
    await this.releaseNotesRepository.markRead(userId, command.id);
    const releaseNote = await this.releaseNotesRepository.findOneForUser(
      userId,
      command.id,
    );
    if (!releaseNote) throw new ReleaseNoteNotFoundError(command.id);
    return releaseNote;
  }
}
