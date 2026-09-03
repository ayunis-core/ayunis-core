import { Injectable, Logger } from '@nestjs/common';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { EnqueueUrlCrawlCommand } from './enqueue-url-crawl.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';

@Injectable()
export class EnqueueUrlCrawlUseCase {
  private readonly logger = new Logger(EnqueueUrlCrawlUseCase.name);

  constructor(
    private readonly urlCrawlProcessingPort: UrlCrawlProcessingPort,
  ) {}

  async execute(command: EnqueueUrlCrawlCommand): Promise<void> {
    this.logger.debug(
      {
        sourceId: command.sourceId,
        url: command.rootUrl,
      },
      'Enqueuing URL crawl job',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error enqueuing URL crawl job',
      );
      throw new UnexpectedSourceError('Error enqueuing URL crawl job', {
        error: error as Error,
      });
    }
  }
}
