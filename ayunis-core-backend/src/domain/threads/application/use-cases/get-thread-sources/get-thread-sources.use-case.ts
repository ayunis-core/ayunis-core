import { Injectable, Logger } from '@nestjs/common';
import { Source } from 'src/domain/sources/domain/source.entity';
import { FindThreadSourcesQuery } from './get-thread-sources.query';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetThreadSourcesUseCase {
  private readonly logger = new Logger(GetThreadSourcesUseCase.name);

  constructor(private readonly findThreadUseCase: FindThreadUseCase) {}

  async execute(query: FindThreadSourcesQuery): Promise<Source[]> {
    this.logger.log(
      {
        threadId: query.threadId,
      },
      'getThreadSources',
    );

    try {
      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(query.threadId),
      );
      return (
        thread.sourceAssignments?.map((assignment) => assignment.source) ?? []
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ThreadNotFoundError(query.threadId);
    }
  }
}
