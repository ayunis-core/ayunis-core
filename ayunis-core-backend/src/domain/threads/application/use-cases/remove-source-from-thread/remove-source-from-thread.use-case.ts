import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveSourceCommand } from './remove-source.command';
import { SourceRemovalError, SourceNotFoundError } from '../../threads.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class RemoveSourceFromThreadUseCase {
  constructor(
    @InjectPinoLogger(RemoveSourceFromThreadUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveSourceCommand): Promise<void> {
    this.logger.info(
      {
        threadId: command.thread.id,
        sourceId: command.sourceId,
      },
      'removeSource',
    );

    try {
      if (!command.thread.sourceAssignments) {
        throw new SourceNotFoundError(command.sourceId);
      }

      const assignmentToRemove = command.thread.sourceAssignments.find(
        (assignment) => assignment.source.id === command.sourceId,
      );

      if (!assignmentToRemove) {
        throw new SourceNotFoundError(command.sourceId);
      }

      const orgId = this.contextService.get('orgId');
      if (!orgId) throw new UnauthorizedAccessError();
      await this.deleteSourceUseCase.execute(
        new DeleteSourceCommand(assignmentToRemove.source.id, orgId),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error(
        {
          threadId: command.thread.id,
          sourceId: command.sourceId,
          err: error as Error,
        },
        'Failed to remove source from thread',
      );

      throw error instanceof Error
        ? new SourceRemovalError(command.thread.id, error)
        : new SourceRemovalError(command.thread.id, new Error('Unknown error'));
    }
  }
}
