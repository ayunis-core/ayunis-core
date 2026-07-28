import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Source } from 'src/domain/sources/domain/source.entity';
import { StartFileSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-file-source-processing/start-file-source-processing.use-case';
import { StartFileSourceProcessingCommand } from 'src/domain/sources/application/use-cases/start-file-source-processing/start-file-source-processing.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { Thread } from '../../../domain/thread.entity';
import { UnexpecteThreadError } from '../../threads.errors';
import { assertThreadHasSourceCapacity } from '../../util/thread-source-capacity';
import { FindThreadUseCase } from '../find-thread/find-thread.use-case';
import { FindThreadQuery } from '../find-thread/find-thread.query';
import { AddSourceToThreadUseCase } from '../add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from '../add-source-to-thread/add-source.command';
import { AddFileSourceToThreadCommand } from './add-file-source-to-thread.command';

@Injectable()
export class AddFileSourceToThreadUseCase {
  private readonly logger = new Logger(AddFileSourceToThreadUseCase.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly startFileSourceProcessingUseCase: StartFileSourceProcessingUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: AddFileSourceToThreadCommand): Promise<Source[]> {
    this.logger.log('addFileSourceToThread', {
      threadId: command.threadId,
      fileName: command.file.originalname,
    });

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );

    // Processing uploads to object storage and enqueues a job, neither of
    // which the attach below can undo cheaply — so the cap is checked first,
    // on the already-loaded thread. AddSourceToThreadUseCase re-checks it
    // against a fresh thread inside a transaction and stays authoritative
    // for concurrent adds.
    assertThreadHasSourceCapacity(thread.sourceAssignments ?? []);

    const sources = await this.startFileSourceProcessingUseCase.execute(
      new StartFileSourceProcessingCommand(
        command.file,
        // A workbook creates one source per data sheet; re-check the cap with
        // the real count so an oversized upload is rejected before any
        // sources, storage objects, or jobs exist.
        (sourceCount) =>
          assertThreadHasSourceCapacity(
            thread.sourceAssignments ?? [],
            sourceCount,
          ),
      ),
    );
    await this.attachOrCompensate(thread, sources);
    return sources;
  }

  // Processing has already started when attaching fails, so the pre-created
  // sources must be deleted or they survive as untracked orphans.
  private async attachOrCompensate(
    thread: Thread,
    sources: Source[],
  ): Promise<void> {
    try {
      await this.attachSources(thread, sources);
    } catch (error) {
      try {
        await this.deleteSourcesUseCase.execute(
          new DeleteSourcesCommand(sources.map((source) => source.id)),
        );
      } catch (cleanupError) {
        this.logger.error('Failed to delete sources after attach failure', {
          sourceIds: sources.map((source) => source.id),
          error: cleanupError as Error,
        });
      }
      throw error;
    }
  }

  @Transactional()
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
