import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ThreadsRepository } from '../../ports/threads.repository';
import type { Thread } from '../../../domain/thread.entity';
import type { FindThreadsByIdsQuery } from './find-threads-by-ids.query';

@Injectable()
export class FindThreadsByIdsUseCase {
  constructor(
    @InjectPinoLogger(FindThreadsByIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async execute(query: FindThreadsByIdsQuery): Promise<Thread[]> {
    this.logger.debug(
      {
        userId: query.userId,
        count: query.ids.length,
      },
      'findThreadsByIds',
    );
    return this.threadsRepository.findAllByIds(query.userId, query.ids);
  }
}
