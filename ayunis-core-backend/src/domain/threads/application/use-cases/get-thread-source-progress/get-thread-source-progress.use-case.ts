import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { GetThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { FindThreadSourcesQuery } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.query';
import { GetSourceProcessingProgressUseCase } from 'src/domain/sources/application/use-cases/get-source-processing-progress/get-source-processing-progress.use-case';
import type { SourceProcessingProgress } from 'src/domain/sources/application/models/source-processing-progress';

@Injectable()
export class GetThreadSourceProgressUseCase {
  constructor(
    private readonly getSources: GetThreadSourcesUseCase,
    private readonly progress: GetSourceProcessingProgressUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(
    query: FindThreadSourcesQuery,
  ): Promise<SourceProcessingProgress[]> {
    const sources = await this.getSources.execute(query);
    return this.progress.execute(sources);
  }
}
