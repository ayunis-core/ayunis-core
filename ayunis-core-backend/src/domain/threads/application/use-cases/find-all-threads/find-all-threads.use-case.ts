import { Injectable, Logger } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class FindAllThreadsUseCase {
  private readonly logger = new Logger(FindAllThreadsUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindAllThreadsQuery): Promise<Paginated<Thread>> {
    // A token client lists its own chats unless it asks for another client's,
    // as chats started there are filed under it (`CreateThreadUseCase`).
    const filters = {
      ...query.filters,
      client: query.filters?.client ?? this.contextService.get('client'),
    };
    const { search: text, ...safeFilters } = filters;
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
        filters,
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
