import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Source } from 'src/domain/sources/domain/source.entity';
import { CompleteSourceUploadUseCase } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { assertThreadHasSourceCapacity } from 'src/domain/threads/application/util/thread-source-capacity';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { CompleteThreadSourceUploadCommand } from './complete-thread-source-upload.command';

/**
 * Finishes a direct upload for a thread: the sources module verifies the
 * stored file and creates the PROCESSING sources. Attachment joins that
 * transaction, so processing is queued only after both have committed.
 *
 * Capacity is checked twice on purpose: once from the thread already loaded,
 * before the workbook is read, so an obviously full thread fails cheaply; and
 * once more under a row lock while attaching, which is the authoritative check
 * against a concurrent completion on the same thread.
 */
@Injectable()
export class CompleteThreadSourceUploadUseCase {
  private readonly logger = new Logger(CompleteThreadSourceUploadUseCase.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly completeUpload: CompleteSourceUploadUseCase,
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: CompleteThreadSourceUploadCommand): Promise<Source[]> {
    this.logger.log(
      { threadId: command.threadId, uploadId: command.uploadId },
      'completeThreadSourceUpload',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    const assignments = thread.sourceAssignments ?? [];
    const { sources } = await this.completeUpload.execute(
      new CompleteSourceUploadCommand({
        uploadId: command.uploadId,
        targetType: SourceUploadTargetType.THREAD,
        targetId: thread.id,
        ensureCapacityFor: (sourceCount) =>
          assertThreadHasSourceCapacity(assignments, sourceCount),
        attach: (created) =>
          this.threadsRepository.attachSourcesWithinCapacity({
            threadId: thread.id,
            userId,
            sourceIds: created.map((created) => created.id),
            maxSources: ThreadsConstants.MAX_SOURCES,
          }),
      }),
    );

    return sources;
  }
}
