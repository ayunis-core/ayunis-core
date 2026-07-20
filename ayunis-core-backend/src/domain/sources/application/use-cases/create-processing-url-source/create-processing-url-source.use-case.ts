import { Injectable, Logger } from '@nestjs/common';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRepository } from '../../ports/source.repository';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UrlCrawlConstants } from 'src/domain/retrievers/url-retrievers/domain/url-crawl.constants';
import { CreateProcessingUrlSourceCommand } from './create-processing-url-source.command';

@Injectable()
export class CreateProcessingUrlSourceUseCase {
  private readonly logger = new Logger(CreateProcessingUrlSourceUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(command: CreateProcessingUrlSourceCommand): Promise<UrlSource> {
    this.logger.debug('Creating processing URL source', { url: command.url });

    try {
      const source = new UrlSource({
        url: command.url,
        // Placeholder until the crawl resolves the real page title.
        name: this.placeholderName(command.url),
        type: TextType.WEB,
        // Clamp to the crawler's cap so the stored depth never overstates how
        // deep the source was actually crawled (CrawlUrlUseCase re-clamps too).
        maxDepth: this.clampDepth(command.maxDepth),
        status: SourceStatus.PROCESSING,
        // processingStartedAt is left null and only armed when the worker picks
        // up the job, so a source waiting in the queue is not reaped by the
        // stale-processing cleanup before its crawl has even started.
      });

      return (await this.sourceRepository.save(source)) as UrlSource;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating processing URL source', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error creating processing URL source', {
        error: error as Error,
      });
    }
  }

  private placeholderName(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  /** Mirror CrawlUrlUseCase's clamp so persisted depth matches the crawl. */
  private clampDepth(depth: number): number {
    if (depth < 0) return 0;
    return Math.min(depth, UrlCrawlConstants.MAX_DEPTH);
  }
}
