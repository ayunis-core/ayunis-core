import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { recordSourceUploadOutcome } from 'src/domain/sources/application/util/source-upload-telemetry.helper';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { AbortSourceUploadCommand } from './abort-source-upload.command';

/** Cancels a transfer the user gave up on; completed sessions are untouched. */
@Injectable()
export class AbortSourceUploadUseCase {
  private readonly logger = new Logger(AbortSourceUploadUseCase.name);

  constructor(
    private readonly access: SourceUploadSessionAccessService,
    private readonly sessions: SourceUploadSessionRepository,
    private readonly storageCleanup: SourceUploadStorageCleanupService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: AbortSourceUploadCommand): Promise<void> {
    const session = await this.access.requireOwned(command.uploadId);
    const aborted = await this.sessions.transition(
      session.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.ABORTED,
    );
    if (!aborted) return;
    recordSourceUploadOutcome('aborted', session);
    await this.storageCleanup.discard(session);
    this.logger.log({ uploadId: session.id }, 'Aborted source upload');
  }
}
