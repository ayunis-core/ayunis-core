import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { MAX_SOURCE_FILE_SIZE_BYTES } from 'src/common/util/source-file-upload';
import {
  type CreatedSourceUpload,
  CreateSourceUploadSessionUseCase,
} from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import { CreateSourceUploadSessionCommand } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { assertThreadHasSourceCapacity } from 'src/domain/threads/application/util/thread-source-capacity';
import { CreateThreadSourceUploadCommand } from './create-thread-source-upload.command';

@Injectable()
export class CreateThreadSourceUploadUseCase {
  private readonly logger = new Logger(CreateThreadSourceUploadUseCase.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly createSession: CreateSourceUploadSessionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(
    command: CreateThreadSourceUploadCommand,
  ): Promise<CreatedSourceUpload> {
    this.logger.log(
      { threadId: command.threadId, fileName: command.fileName },
      'createThreadSourceUpload',
    );
    if (command.threadId) {
      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );
      assertThreadHasSourceCapacity(thread.sourceAssignments ?? []);
    }
    return this.createSession.execute(
      new CreateSourceUploadSessionCommand({
        targetType: SourceUploadTargetType.THREAD,
        targetId: command.threadId ?? null,
        fileName: command.fileName,
        mimeType: command.mimeType,
        fileSize: command.fileSize,
        maxFileSizeBytes: MAX_SOURCE_FILE_SIZE_BYTES,
      }),
    );
  }
}
