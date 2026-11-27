import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ReleaseNotesRepository } from 'src/domain/release-notes/application/ports/release-notes.repository';
import { UnexpectedReleaseNoteError } from 'src/domain/release-notes/application/release-notes.errors';

@Injectable()
export class MarkAllReleaseNotesReadUseCase {
  private readonly logger = new Logger(MarkAllReleaseNotesReadUseCase.name);

  constructor(
    private readonly releaseNotesRepository: ReleaseNotesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedReleaseNoteError)
  async execute(): Promise<void> {
    this.logger.log('Marking all release notes read');
    const { userId } = getRequiredUserContext(this.contextService);
    await this.releaseNotesRepository.markAllRead(userId);
  }
}
