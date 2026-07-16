import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UnexpectedThreadError } from '../../threads.errors';

@Injectable()
export class FindAllThreadsUseCase {
  private readonly logger = new Logger(FindAllThreadsUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(query: FindAllThreadsQuery): Promise<Paginated<Thread>> {
    this.logger.log('findAll', {
      userId: query.userId,
      filters: query.filters,
      limit: query.limit,
      offset: query.offset,
    });
    return this.threadsRepository.findAll(
      query.userId,
      query.options,
      query.filters,
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
  }
}
