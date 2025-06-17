import { Injectable, Logger, Inject } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';

@Injectable()
export class FindAllThreadsUseCase {
  private readonly logger = new Logger(FindAllThreadsUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(query: FindAllThreadsQuery): Promise<Thread[]> {
    this.logger.log('findAll', { userId: query.userId });
    try {
      return await this.threadsRepository.findAll(query.userId);
    } catch (error) {
      this.logger.error('Failed to find all threads', {
        userId: query.userId,
        error,
      });
      throw error;
    }
  }
}
