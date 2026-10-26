import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { UrlRetrieverUnsupportedContentTypeError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import { classifySourceProcessingError } from './classify-source-processing-error';
import { reportProviderUnavailableMetric } from 'src/common/errors/report-provider-unavailable-metric.helper';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { PdfLink } from 'src/domain/retrievers/url-retrievers/domain/pdf-link';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceProcessingHelper } from './source-processing-helper.service';
import { SourceProcessingHeartbeatService } from './source-processing-heartbeat.service';
import {
  FileSource,
  TextSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

@Injectable()
export class CrawledPdfSourcesService {
  private readonly logger = new Logger(CrawledPdfSourcesService.name);

  constructor(
    private readonly repository: SourceRepository,
    private readonly retrieveUrl: RetrieveUrlUseCase,
    private readonly splitText: SplitTextUseCase,
    private readonly helper: SourceProcessingHelper,
    private readonly heartbeat: SourceProcessingHeartbeatService,
  ) {}

  async process(
    source: TextSource,
    links: PdfLink[],
    orgId: UUID,
  ): Promise<void> {
    const files = source.knowledgeBaseId
      ? links.map(
          (link) =>
            new FileSource({
              name: link.name,
              url: link.url,
              fileType: FileType.PDF,
              type: TextType.FILE,
              knowledgeBaseId: source.knowledgeBaseId,
              status: SourceStatus.PROCESSING,
              processingStartedAt: new Date(),
            }),
        )
      : [];
    // The HTML source and its PDF registrations commit together. A redelivery
    // cannot re-create deleted files or compete with the winning PDF processor.
    const registered = await this.repository.completeCrawlWithFileSources(
      source.id,
      files,
      KnowledgeBasesConstants.MAX_SOURCES,
    );
    if (!registered) {
      const current = await this.repository.findById(source.id);
      if (current?.status !== SourceStatus.READY)
        await this.helper.cleanupIndex(source.id);
      return;
    }
    let previous = Promise.resolve();
    await Promise.all(
      registered.map((file) => {
        const processing = previous
          .then(() => this.processFile(file, orgId))
          .catch((error: unknown) => {
            this.logger.error(
              { sourceId: file.id, err: error },
              'Could not persist PDF processing outcome',
            );
          });
        previous = processing;
        return this.heartbeat.run(file.id, () => processing);
      }),
    );
  }

  private async processFile(file: FileSource, orgId: UUID): Promise<void> {
    try {
      const result = await this.retrieveUrl.execute(
        new RetrieveUrlCommand(file.url!, orgId, undefined, 'explicit-grant'),
      );
      if (!result.isPdf)
        throw new UrlRetrieverUnsupportedContentTypeError(
          file.url!,
          'non-PDF response',
        );
      const split = this.splitText.execute(
        new SplitTextCommand(result.content, SplitterType.RECURSIVE, {
          chunkSize: 2000,
          chunkOverlap: 200,
        }),
      );
      const chunks = split.chunks.map(
        (chunk) =>
          new TextSourceContentChunk({
            content: chunk.text,
            meta: { ...chunk.metadata, url: file.url },
          }),
      );
      const alive = await this.repository.saveProcessingTextSourceContent(
        file,
        { text: result.content, chunks },
      );
      if (!alive) return;
      await this.helper.index(file.id, orgId, chunks);
      if (
        !(await this.repository.updateStatusConditionally(
          file.id,
          SourceStatus.PROCESSING,
          SourceStatus.READY,
          { processingError: null },
        ))
      ) {
        await this.helper.cleanupIndex(file.id);
      }
    } catch (error) {
      await this.markFileFailed(file.id, error);
    }
  }

  private async markFileFailed(sourceId: UUID, error: unknown): Promise<void> {
    this.logger.warn({ sourceId: sourceId }, 'PDF source processing failed');
    const markedFailed = await this.repository.updateStatusConditionally(
      sourceId,
      SourceStatus.PROCESSING,
      SourceStatus.FAILED,
      {
        processingError:
          error instanceof Error ? error.message : 'Unknown processing error',
        processingErrorCode: classifySourceProcessingError(error),
      },
    );
    if (markedFailed) reportProviderUnavailableMetric(error);
    await this.helper.cleanupIndex(sourceId);
  }
}
