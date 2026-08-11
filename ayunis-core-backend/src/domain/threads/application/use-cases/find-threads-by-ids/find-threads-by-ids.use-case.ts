import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import type { Thread } from '../../../domain/thread.entity';
import type { FindThreadsByIdsQuery } from './find-threads-by-ids.query';

@Injectable()
export class FindThreadsByIdsUseCase {
  private readonly logger = new Logger(FindThreadsByIdsUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(query: FindThreadsByIdsQuery): Promise<Thread[]> {
    this.logger.debug('findThreadsByIds', {
      userId: query.userId,
      count: query.ids.length,
    });
    return this.threadsRepository.findAllByIds(query.userId, query.ids);
  }
}
