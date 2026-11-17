import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PresignDownloadUseCase } from 'src/domain/storage/application/use-cases/presign-download/presign-download.use-case';
import { PresignDownloadCommand } from 'src/domain/storage/application/use-cases/presign-download/presign-download.command';
import type { ThreadFileObject } from 'src/domain/threads/application/models/thread-file-object';
import {
  ThreadFileAddedBySkillError,
  ThreadFileNotFoundError,
  ThreadFileNotStoredError,
  ThreadNotFoundError,
  UnexpecteThreadError,
} from 'src/domain/threads/application/threads.errors';
import type { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { ResolveThreadFileQuery } from './resolve-thread-file.query';

// Every URL handed out has 3–5 minutes left, and a retry within the same
// two minutes gets the identical URL, so the receiver sees the same file.
const DOWNLOAD_URL_EXPIRY_SECONDS = 300;
const DOWNLOAD_URL_SIGNING_WINDOW_SECONDS = 120;

/**
 * Resolves a file the current user attached to their chat to a file object
 * with a signed download URL for the stored original.
 */
@Injectable()
export class ResolveThreadFileUseCase {
  private readonly logger = new Logger(ResolveThreadFileUseCase.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly presignDownloadUseCase: PresignDownloadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(query: ResolveThreadFileQuery): Promise<ThreadFileObject> {
    this.logger.log(
      { threadId: query.threadId, sourceId: query.sourceId },
      'Resolving thread file',
    );
    const assignment = await this.findAssignment(query);
    if (assignment.originSkillId) {
      throw new ThreadFileAddedBySkillError(query.sourceId);
    }
    const original = assignment.source.storedOriginal();
    if (!original) {
      throw new ThreadFileNotStoredError(query.sourceId);
    }

    const downloadUrl = await this.presignDownloadUseCase.execute(
      new PresignDownloadCommand(
        original.storageKey,
        DOWNLOAD_URL_EXPIRY_SECONDS,
        DOWNLOAD_URL_SIGNING_WINDOW_SECONDS,
        { contentType: original.mimeType, fileName: original.fileName },
      ),
    );
    return {
      download_url: downloadUrl,
      file_id: assignment.source.id,
      mime_type: original.mimeType,
      file_name: original.fileName,
    };
  }

  private async findAssignment(
    query: ResolveThreadFileQuery,
  ): Promise<SourceAssignment> {
    let thread: Thread;
    try {
      ({ thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(query.threadId),
      ));
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw new ThreadFileNotFoundError(query.sourceId);
      }
      throw error;
    }
    const assignment = thread.sourceAssignments?.find(
      ({ source }) => source.id === query.sourceId,
    );
    if (!assignment) {
      throw new ThreadFileNotFoundError(query.sourceId);
    }
    return assignment;
  }
}
