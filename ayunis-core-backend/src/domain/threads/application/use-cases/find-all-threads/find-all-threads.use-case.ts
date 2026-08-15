import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class FindAllThreadsUseCase {
  constructor(
    @InjectPinoLogger(FindAllThreadsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async execute(query: FindAllThreadsQuery): Promise<Paginated<Thread>> {
    const { search: text, ...safeFilters } = query.filters ?? {};
    this.logger.info(
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
