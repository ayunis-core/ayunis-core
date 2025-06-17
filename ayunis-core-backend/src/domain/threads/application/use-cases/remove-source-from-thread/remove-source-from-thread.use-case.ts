import { Injectable, Logger, Inject } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveSourceCommand } from './remove-source.command';
import { SourceRemovalError, SourceNotFoundError } from '../../threads.errors';

@Injectable()
export class RemoveSourceFromThreadUseCase {
  private readonly logger = new Logger(RemoveSourceFromThreadUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: RemoveSourceCommand): Promise<Thread> {
    this.logger.log('removeSource', {
      threadId: command.thread.id,
      sourceId: command.sourceId,
    });

    try {
      if (!command.thread.sources) {
        throw new SourceNotFoundError(command.sourceId, command.thread.id);
      }

      const sourceIndex = command.thread.sources.findIndex(
        (source) => source.id === command.sourceId,
      );

      if (sourceIndex === -1) {
        throw new SourceNotFoundError(command.sourceId, command.thread.id);
      }

      command.thread.sources.splice(sourceIndex, 1); // TODO: Optimize this
      return await this.threadsRepository.update(command.thread);
    } catch (error) {
      if (error instanceof SourceNotFoundError) {
        throw error;
      }

      this.logger.error('Failed to remove source from thread', {
        threadId: command.thread.id,
        sourceId: command.sourceId,
        error,
      });

      throw error instanceof Error
        ? new SourceRemovalError(command.thread.id, error)
        : new SourceRemovalError(command.thread.id, new Error('Unknown error'));
    }
  }
}
