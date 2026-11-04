import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { FindThreadSourcesQuery } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.query';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

@Injectable()
export class AuthorizedCsvSourceResolverService {
  private readonly logger = new Logger(AuthorizedCsvSourceResolverService.name);

  constructor(
    private readonly getThreadSourcesUseCase: GetThreadSourcesUseCase,
  ) {}

  async resolve(params: {
    threadId: UUID;
    sourceIds: readonly string[];
  }): Promise<CSVDataSource[]> {
    if (params.sourceIds.length === 0) return [];
    const threadSources = await this.getThreadSources(params.threadId);
    const sourcesById = new Map(
      threadSources.map((source) => [source.id, source]),
    );

    return params.sourceIds.map((sourceId) => {
      const source = sourcesById.get(sourceId as UUID);
      if (!source) {
        throw new Error(
          `Data source ${sourceId} is not attached to this conversation.`,
        );
      }
      if (!(source instanceof CSVDataSource)) {
        throw new Error(`Source ${sourceId} is not a CSV data source.`);
      }
      this.assertReady(source);
      return source;
    });
  }

  private async getThreadSources(threadId: UUID) {
    try {
      return await this.getThreadSourcesUseCase.execute(
        new FindThreadSourcesQuery(threadId),
      );
    } catch (error) {
      this.logger.error(
        { err: error, threadId },
        'Failed to resolve authorized CSV sources',
      );
      throw error;
    }
  }

  private assertReady(source: CSVDataSource): void {
    if (source.status === SourceStatus.READY) return;
    if (source.status === SourceStatus.PROCESSING) {
      throw new Error(
        `Data source ${source.id} is still processing — wait for it to finish before using it.`,
      );
    }
    const detail = source.processingError ? ` (${source.processingError})` : '';
    throw new Error(
      `Data source ${source.id} failed to process and cannot be used${detail} — do not retry; tell the user the file could not be processed.`,
    );
  }
}
