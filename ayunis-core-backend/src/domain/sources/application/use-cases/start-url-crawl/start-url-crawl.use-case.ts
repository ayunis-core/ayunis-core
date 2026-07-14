import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CreateProcessingUrlSourceUseCase } from '../create-processing-url-source/create-processing-url-source.use-case';
import { CreateProcessingUrlSourceCommand } from '../create-processing-url-source/create-processing-url-source.command';
import { MarkSourceFailedUseCase } from '../mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from '../mark-source-failed/mark-source-failed.command';
import { EnqueueUrlCrawlUseCase } from '../enqueue-url-crawl/enqueue-url-crawl.use-case';
import { EnqueueUrlCrawlCommand } from '../enqueue-url-crawl/enqueue-url-crawl.command';
import { UnexpectedSourceError } from '../../sources.errors';
import { StartUrlCrawlCommand } from './start-url-crawl.command';

@Injectable()
export class StartUrlCrawlUseCase {
  private readonly logger = new Logger(StartUrlCrawlUseCase.name);

  constructor(
    private readonly createProcessingUrlSourceUseCase: CreateProcessingUrlSourceUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
    private readonly enqueueUrlCrawlUseCase: EnqueueUrlCrawlUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: StartUrlCrawlCommand): Promise<UrlSource> {
    this.logger.log('Starting async URL crawl', {
      url: command.url,
      maxDepth: command.maxDepth,
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new Error('orgId is required');
    const userId = this.contextService.get('userId');
    if (!userId) throw new Error('userId is required');

    // 1. Create source with PROCESSING status
    const savedSource = await this.createProcessingUrlSourceUseCase.execute(
      new CreateProcessingUrlSourceCommand({
        url: command.url,
        maxDepth: command.maxDepth,
      }),
    );

    // 2. Enqueue BullMQ crawl job
    try {
      await this.enqueueUrlCrawlUseCase.execute(
        new EnqueueUrlCrawlCommand({
          sourceId: savedSource.id,
          orgId,
          userId,
          rootUrl: command.url,
          maxDepth: command.maxDepth,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to enqueue URL crawl job', {
        sourceId: savedSource.id,
        error: error as Error,
      });
      await this.tryMarkSourceFailed(
        savedSource,
        'Failed to enqueue crawl job',
      );
      throw error;
    }

    return savedSource;
  }

  private async tryMarkSourceFailed(
    source: UrlSource,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({ sourceId: source.id, errorMessage }),
      );
    } catch (err) {
      this.logger.error('Failed to mark source as FAILED', {
        sourceId: source.id,
        error: err as Error,
      });
    }
  }
}
