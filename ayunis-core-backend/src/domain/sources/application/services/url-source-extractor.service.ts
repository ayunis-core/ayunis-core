import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CrawlUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.use-case';
import { CrawlUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import {
  type ExtractedTextSourceContent,
  TextSourceExtractor,
} from './text-source-extractor';

const PAGE_SEPARATOR = '\n\n';

export interface UrlSourceInput {
  rootUrl: string;
  orgId: UUID;
  maxDepth: number;
}

/**
 * Crawls a root URL up to `maxDepth` levels of same-site links. Each page is
 * split on its own, and its chunk offsets are shifted into the coordinates
 * of the concatenated source text.
 */
@Injectable()
export class UrlSourceExtractor extends TextSourceExtractor<UrlSourceInput> {
  private readonly logger = new Logger(UrlSourceExtractor.name);

  constructor(
    private readonly crawlUrlUseCase: CrawlUrlUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
  ) {
    super();
  }

  async extract(input: UrlSourceInput): Promise<ExtractedTextSourceContent> {
    const crawl = await this.crawlUrlUseCase.execute(
      new CrawlUrlCommand(input.rootUrl, input.orgId, input.maxDepth),
    );

    const chunks: TextSourceContentChunk[] = [];
    const texts: string[] = [];
    let lineOffset = 0;
    let charOffset = 0;
    for (const page of crawl.pages) {
      if (texts.length > 0) {
        lineOffset += this.countNewlines(PAGE_SEPARATOR);
        charOffset += PAGE_SEPARATOR.length;
      }
      texts.push(page.content);
      chunks.push(
        ...this.chunkPage(page.url, page.content, lineOffset, charOffset),
      );
      lineOffset += this.countNewlines(page.content);
      charOffset += page.content.length;
    }

    this.logger.log(
      { url: input.rootUrl, pages: crawl.pages.length },
      'URL crawled',
    );
    return {
      text: texts.join(PAGE_SEPARATOR),
      chunks,
      name: crawl.rootPage.websiteTitle,
    };
  }

  private chunkPage(
    url: string,
    content: string,
    lineOffset: number,
    charOffset: number,
  ): TextSourceContentChunk[] {
    const split = this.splitTextUseCase.execute(
      new SplitTextCommand(content, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );
    return split.chunks.map(
      (chunk) =>
        new TextSourceContentChunk({
          content: chunk.text,
          meta: {
            url,
            ...chunk.metadata,
            ...this.offsetMetadata(chunk.metadata, lineOffset, charOffset),
          },
        }),
    );
  }

  private offsetMetadata(
    metadata: Record<string, unknown>,
    lineOffset: number,
    charOffset: number,
  ): Record<string, number> {
    const shifted: Record<string, number> = {};
    this.shiftNumber(metadata, shifted, 'startLine', lineOffset);
    this.shiftNumber(metadata, shifted, 'endLine', lineOffset);
    this.shiftNumber(metadata, shifted, 'startCharOffset', charOffset);
    this.shiftNumber(metadata, shifted, 'endCharOffset', charOffset);
    return shifted;
  }

  private shiftNumber(
    source: Record<string, unknown>,
    target: Record<string, number>,
    key: string,
    offset: number,
  ): void {
    const value = source[key];
    if (typeof value === 'number') target[key] = value + offset;
  }

  private countNewlines(text: string): number {
    let count = 0;
    for (let index = 0; index < text.length; index++) {
      if (text.charCodeAt(index) === 10) count++;
    }
    return count;
  }
}
