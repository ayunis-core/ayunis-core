import { Injectable, Logger } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class FindAllThreadsUseCase {
  private readonly logger = new Logger(FindAllThreadsUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(query: FindAllThreadsQuery): Promise<Paginated<Thread>> {
    this.logger.log('findAll', {
      userId: query.userId,
      filters: query.filters,
      limit: query.limit,
      offset: query.offset,
    });
    try {
      return await this.threadsRepository.findAll(
        query.userId,
        query.options,
        query.filters,
        { limit: query.limit, offset: query.offset },
      );
    } catch (error) {
      this.logger.error('Failed to find all threads', {
        userId: query.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
