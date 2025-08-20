import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { UrlSource } from '../../../domain/sources/url-source.entity';
import { SourceContent } from '../../../domain/source-content.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { CreateUrlSourceCommand } from './create-url-source.command';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { IngestContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.use-case';
import { IngestContentCommand } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';

@Injectable()
export class CreateUrlSourceUseCase {
  private readonly logger = new Logger(CreateUrlSourceUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
    private readonly retrieveUrlUseCase: RetrieveUrlUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly ingestContentUseCase: IngestContentUseCase,
  ) {}

  async execute(command: CreateUrlSourceCommand): Promise<UrlSource> {
    this.logger.debug(`Creating URL source for URL: ${command.url}`);

    const urlRetrieverResult = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(command.url),
    );

    const urlSource = new UrlSource({
      url: command.url,
      content: [],
      text: urlRetrieverResult.content,
      websiteTitle: urlRetrieverResult.websiteTitle,
    });
    // TODO: This is a hack to get the id of the source
    // Because cascading is not working as expected
    await this.sourceRepository.create(urlSource);

    urlSource.content = this.getSourceContentsFromText(
      urlSource.id,
      urlRetrieverResult.content,
      {
        url: command.url,
      },
    );

    const savedUrlSource =
      await this.sourceRepository.createUrlSource(urlSource);

    // Index the content using the indexers module
    await this.indexSourceContent(savedUrlSource, command.orgId);

    return savedUrlSource;
  }

  /**
   * Process text content into source contents
   */
  private getSourceContentsFromText(
    sourceId: UUID,
    text: string,
    meta: Record<string, any> = {},
  ): SourceContent[] {
    const sourceContents: SourceContent[] = [];

    // Split text into content blocks
    const contentBlocks = this.splitTextUseCase.execute(
      new SplitTextCommand(text, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );

    for (const contentBlock of contentBlocks.chunks) {
      // Create source content for each content block
      const sourceContent = new SourceContent({
        sourceId,
        content: contentBlock.text,
        meta,
      });

      sourceContents.push(sourceContent);
    }

    return sourceContents;
  }

  /**
   * Index source content using the indexers module
   */
  private async indexSourceContent(
    source: UrlSource,
    orgId: UUID,
  ): Promise<void> {
    this.logger.debug(`Indexing content for source: ${source.id}`);

    for (const content of source.content) {
      const ingestCommand = new IngestContentCommand({
        documentId: source.id,
        chunkId: content.id,
        content: content.content,
        type: IndexType.PARENT_CHILD,
        orgId: orgId,
      });

      await this.ingestContentUseCase.execute(ingestCommand);
    }

    this.logger.debug(
      `Successfully indexed ${source.content.length} content blocks for source: ${source.id}`,
    );
  }
}
