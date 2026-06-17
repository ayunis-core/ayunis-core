import { Injectable, Logger } from '@nestjs/common';
import { UrlCrawlProcessingPort } from '../../ports/url-crawl-processing.port';
import { EnqueueUrlCrawlCommand } from './enqueue-url-crawl.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueUrlCrawlUseCase {
  private readonly logger = new Logger(EnqueueUrlCrawlUseCase.name);

  constructor(
    private readonly urlCrawlProcessingPort: UrlCrawlProcessingPort,
  ) {}

  async execute(command: EnqueueUrlCrawlCommand): Promise<void> {
    this.logger.debug('Enqueuing URL crawl job', {
      sourceId: command.sourceId,
      rootUrl: command.rootUrl,
    });

    try {
      await this.urlCrawlProcessingPort.enqueue({
        sourceId: command.sourceId,
        orgId: command.orgId,
        userId: command.userId,
        rootUrl: command.rootUrl,
        maxDepth: command.maxDepth,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error enqueuing URL crawl job', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error enqueuing URL crawl job', {
        error: error as Error,
      });
    }
  }
}
