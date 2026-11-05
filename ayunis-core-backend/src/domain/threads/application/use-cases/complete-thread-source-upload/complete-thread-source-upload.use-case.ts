import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Source } from 'src/domain/sources/domain/source.entity';
import { CompleteSourceUploadUseCase } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { assertThreadHasSourceCapacity } from 'src/domain/threads/application/util/thread-source-capacity';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { CompleteThreadSourceUploadCommand } from './complete-thread-source-upload.command';

/**
 * Finishes a direct upload for a thread: the sources module verifies the
 * stored file and creates the PROCESSING sources. Attachment joins that
 * transaction, so processing is queued only after both have committed.
 */
@Injectable()
export class CompleteThreadSourceUploadUseCase {
  private readonly logger = new Logger(CompleteThreadSourceUploadUseCase.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly completeUpload: CompleteSourceUploadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: CompleteThreadSourceUploadCommand): Promise<Source[]> {
    this.logger.log(
      { threadId: command.threadId, uploadId: command.uploadId },
      'completeThreadSourceUpload',
    );
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
        attach: (created) => this.attachSources(thread, created),
      }),
    );

    return sources;
  }

  private async attachSources(
    thread: Thread,
    sources: Source[],
  ): Promise<void> {
    for (const source of sources) {
      await this.addSourceToThreadUseCase.execute(
        new AddSourceCommand(thread, source),
      );
    }
  }
}
