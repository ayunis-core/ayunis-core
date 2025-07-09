import { Injectable, Logger } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindThreadQuery } from './find-thread.query';
import { ThreadNotFoundError } from '../../threads.errors';

@Injectable()
export class FindThreadUseCase {
  private readonly logger = new Logger(FindThreadUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(query: FindThreadQuery): Promise<Thread> {
    this.logger.log('findOne', { threadId: query.id, userId: query.userId });
    try {
      const thread = await this.threadsRepository.findOne(
        query.id,
        query.userId,
      );
      if (!thread) {
        throw new ThreadNotFoundError(query.id, query.userId);
      }
      return new Thread({
        ...thread,
      });
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to find thread', {
        threadId: query.id,
        userId: query.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
