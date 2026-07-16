import { Injectable, Logger } from '@nestjs/common';
import { UrlCrawlProcessingPort } from '../../ports/url-crawl-processing.port';
import { EnqueueUrlCrawlCommand } from './enqueue-url-crawl.command';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueUrlCrawlUseCase {
  private readonly logger = new Logger(EnqueueUrlCrawlUseCase.name);

  constructor(
    private readonly urlCrawlProcessingPort: UrlCrawlProcessingPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: EnqueueUrlCrawlCommand): Promise<void> {
    this.logger.debug('Enqueuing URL crawl job', {
      sourceId: command.sourceId,
      rootUrl: command.rootUrl,
    });

    await this.urlCrawlProcessingPort.enqueue({
      sourceId: command.sourceId,
      orgId: command.orgId,
      userId: command.userId,
      rootUrl: command.rootUrl,
      maxDepth: command.maxDepth,
    });
  }
}
