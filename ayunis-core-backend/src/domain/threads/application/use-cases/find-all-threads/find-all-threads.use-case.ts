import { Injectable, Logger } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { getCurrentSessionClient as getCurrentThreadClient } from 'src/common/context/current-session-client';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';

@Injectable()
export class FindAllThreadsUseCase {
  private readonly logger = new Logger(FindAllThreadsUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
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
    const filters = {
      ...query.filters,
      client: getCurrentThreadClient(this.contextService) ?? undefined,
    };
    return await this.threadsRepository.findAll(
      query.userId,
      query.options,
      filters,
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
