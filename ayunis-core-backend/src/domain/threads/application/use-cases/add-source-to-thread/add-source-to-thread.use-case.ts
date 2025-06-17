import { Injectable, Logger, Inject } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddSourceCommand } from './add-source.command';
import { SourceAdditionError } from '../../threads.errors';

@Injectable()
export class AddSourceToThreadUseCase {
  private readonly logger = new Logger(AddSourceToThreadUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: AddSourceCommand): Promise<Thread> {
    this.logger.log('addSource', {
      threadId: command.thread.id,
      sourceId: command.source.id,
    });
    try {
      if (!command.thread.sources) {
        command.thread.sources = [];
      }

      // Check if source already exists in thread
      const sourceExists = command.thread.sources.some(
        (source) => source.id === command.source.id,
      );

      if (!sourceExists) {
        command.thread.sources.push(command.source); // TODO: Optimize this
        return await this.threadsRepository.update(command.thread);
      }

      return command.thread;
    } catch (error) {
      this.logger.error('Failed to add source to thread', {
        threadId: command.thread.id,
        sourceId: command.source.id,
        error,
      });
      throw error instanceof Error
        ? new SourceAdditionError(command.thread.id, error)
        : new SourceAdditionError(
            command.thread.id,
            new Error('Unknown error'),
          );
    }
  }
}
