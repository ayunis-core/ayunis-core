import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceContentDegradedError } from 'src/domain/sources/application/sources.errors';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

/**
 * With fewer previous pages, one removed page already halves the site, which
 * is as likely an edit as an outage.
 */
const MIN_PREVIOUS_PAGES = 2;
/**
 * Sites rarely lose half their pages between runs, while a partial outage,
 * a rate limit or a bot wall typically leaves only the root page or a few.
 */
const MIN_RETAINED_PAGE_RATIO = 0.5;

/**
 * The crawler skips pages it fails to fetch, so a partially failed crawl
 * still "succeeds". A re-index finding far fewer pages (distinct chunk
 * `meta.url`) than the content it would replace is failed instead, keeping
 * the previous content.
 */
@Injectable()
export class SourceContentDegradationGuard {
  private readonly logger = new Logger(SourceContentDegradationGuard.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async assertNotDegraded(
    sourceId: UUID,
    chunks: TextSourceContentChunk[],
  ): Promise<void> {
    const previous = await this.sourceRepository.countIndexedPages(sourceId);
    if (previous < MIN_PREVIOUS_PAGES) return;

    const current = new Set(
      chunks
        .map((chunk) => chunk.meta.url)
        .filter((url) => typeof url === 'string'),
    ).size;
    if (current >= previous * MIN_RETAINED_PAGE_RATIO) return;

    this.logger.warn(
      { sourceId, previousPages: previous, currentPages: current },
      'Re-index found far fewer pages, keeping previous content',
    );
    throw new SourceContentDegradedError(sourceId, { previous, current });
  }
}
