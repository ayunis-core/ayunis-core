import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { Source } from 'src/domain/sources/domain/source.entity';
import { UnexpecteThreadError } from '../../threads.errors';
import { assertThreadHasSourceCapacity } from '../../util/thread-source-capacity';
import { AddSourceToThreadUseCase } from '../add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from '../add-source-to-thread/add-source.command';
import { AddFileSourceToThreadCommand } from './add-file-source-to-thread.command';

@Injectable()
export class AddFileSourceToThreadUseCase {
  private readonly logger = new Logger(AddFileSourceToThreadUseCase.name);

  constructor(
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: AddFileSourceToThreadCommand): Promise<Source> {
    this.logger.log('execute', {
      threadId: command.thread.id,
      fileName: command.fileName,
    });

    // Document processing uploads to object storage and enqueues an OCR job,
    // neither of which the assignment below can undo — so the cap is checked
    // first, on the already-loaded thread. AddSourceToThreadUseCase re-checks
    // it against a fresh thread inside a transaction and stays authoritative
    // for concurrent adds.
    assertThreadHasSourceCapacity(command.thread.sourceAssignments ?? []);

    const source = await this.startDocumentProcessingUseCase.execute(
      new StartDocumentProcessingCommand({
        fileData: command.fileData,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );

    await this.addSourceToThreadUseCase.execute(
      new AddSourceCommand(command.thread, source),
    );

    return source;
  }
}
