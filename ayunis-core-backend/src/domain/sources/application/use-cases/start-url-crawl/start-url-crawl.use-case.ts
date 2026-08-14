import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
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
  constructor(
    @InjectPinoLogger(StartUrlCrawlUseCase.name)
    private readonly logger: PinoLogger,
    private readonly createProcessingUrlSourceUseCase: CreateProcessingUrlSourceUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
    private readonly enqueueUrlCrawlUseCase: EnqueueUrlCrawlUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: StartUrlCrawlCommand): Promise<UrlSource> {
    this.logger.info(
      { maxDepth: command.maxDepth, url: command.url },
      'Starting async URL crawl',
    );

    try {
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

      await this.enqueueOrFail(savedSource, orgId, userId, command);

      return savedSource;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Error starting URL crawl');
      throw new UnexpectedSourceError('Error starting URL crawl', {
        error: error as Error,
      });
    }
  }

  private async enqueueOrFail(
    source: UrlSource,
    orgId: UUID,
    userId: UUID,
    command: StartUrlCrawlCommand,
  ): Promise<void> {
    try {
      await this.enqueueUrlCrawlUseCase.execute(
        new EnqueueUrlCrawlCommand({
          sourceId: source.id,
          orgId,
          userId,
          rootUrl: command.url,
          maxDepth: command.maxDepth,
        }),
      );
    } catch (error) {
      this.logger.error(
        { err: error as Error, sourceId: source.id },
        'Failed to enqueue URL crawl job',
      );
      await this.tryMarkSourceFailed(source, 'Failed to enqueue crawl job');
      throw error;
    }
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
      this.logger.error(
        {
          sourceId: source.id,
          err: err as Error,
        },
        'Failed to mark source as FAILED',
      );
    }
  }
}
