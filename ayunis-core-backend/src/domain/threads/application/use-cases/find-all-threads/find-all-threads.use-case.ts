import { Injectable, Logger } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class FindAllThreadsUseCase {
  private readonly logger = new Logger(FindAllThreadsUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(query: FindAllThreadsQuery): Promise<Paginated<Thread>> {
    const { search: text, ...safeFilters } = query.filters ?? {};
    this.logger.log(
      {
        userId: query.userId,
        ...safeFilters,
        text,
        limit: query.limit,
        offset: query.offset,
      },
      'findAll',
    );
    try {
      return await this.threadsRepository.findAll(
        query.userId,
        query.options,
        query.filters,
        {
          limit: query.limit,
          offset: query.offset,
        },
      );
    } catch (error) {
      this.logger.error(
        {
          userId: query.userId,
          err: error as Error,
        },
        'Failed to find all threads',
      );
      throw error;
    }
  }
}
