import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../../sources/domain/source.entity';
import { FindThreadSourcesQuery } from './get-thread-sources.query';
import { FindThreadUseCase } from '../find-thread/find-thread.use-case';
import { FindThreadQuery } from '../find-thread/find-thread.query';
import { ThreadNotFoundError } from '../../threads.errors';

@Injectable()
export class GetThreadSourcesUseCase {
  private readonly logger = new Logger(GetThreadSourcesUseCase.name);

  constructor(private readonly findThreadUseCase: FindThreadUseCase) {}

  async execute(query: FindThreadSourcesQuery): Promise<Source[]> {
    this.logger.log('getThreadSources', {
      threadId: query.threadId,
      userId: query.userId,
    });

    try {
      const thread = await this.findThreadUseCase.execute(
        new FindThreadQuery(query.threadId, query.userId),
      );
      return thread.sources || [];
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw error;
      }

      this.logger.error('Failed to get thread sources', {
        threadId: query.threadId,
        userId: query.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}
