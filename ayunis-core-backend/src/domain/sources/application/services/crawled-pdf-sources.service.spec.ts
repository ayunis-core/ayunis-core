import { randomUUID } from 'crypto';
import { CrawledPdfSourcesService } from './crawled-pdf-sources.service';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';

function setup() {
  const files = new Map<string, FileSource>();
  const contents = new Map<string, string>();
  const source = new UrlSource({
    name: 'Ortsrecht',
    type: TextType.WEB,
    url: 'https://municipality.test/statutes',
    knowledgeBaseId: randomUUID(),
    status: SourceStatus.PROCESSING,
  });
  const repository = {
    findById: jest.fn(async (): Promise<UrlSource | null> => source),
    completeCrawlWithFileSources: jest.fn(
      async (_sourceId: string, batch: FileSource[]) => {
        if (source.status !== SourceStatus.PROCESSING) return null;
        source.status = SourceStatus.READY;
        for (const file of batch) files.set(file.id, file);
        return batch;
      },
    ),
    saveProcessingTextSourceContent: jest.fn(
      async (file: FileSource, content: { text: string }) => {
        if (!files.has(file.id)) return false;
        contents.set(file.id, content.text);
        return true;
      },
    ),
    updateStatusConditionally: jest.fn(
      async (
        id: string,
        _from: SourceStatus,
        to: SourceStatus,
        updates?: Partial<
          Pick<FileSource, 'processingError' | 'processingErrorCode'>
        >,
      ) => {
        const file = files.get(id);
        if (!file) return false;
        file.status = to;
        Object.assign(file, updates);
        return true;
      },
    ),
  };
  const retrieve = {
    execute: jest.fn(
      async () =>
        new UrlRetrieverResult(
          'Statute section 1',
          'https://cdn.test/statute.pdf',
          'statute.pdf',
          {},
          [],
          [],
          true,
        ),
    ),
  };
  const split = {
    execute: jest.fn(() => ({
      chunks: [
        { text: 'Statute section 1', metadata: { startLine: 1, endLine: 1 } },
      ],
    })),
  };
  const helper = {
    index: jest.fn(),
    cleanupIndex: jest.fn(),
    markFailed: jest.fn(async (id: string) => {
      const file = files.get(id);
      if (file) file.status = SourceStatus.FAILED;
    }),
  };
  const heartbeat = {
    run: jest.fn(async (_id: string, operation: () => Promise<unknown>) =>
      operation(),
    ),
  };
  const service = new CrawledPdfSourcesService(
    repository as never,
    retrieve as never,
    split as never,
    helper as never,
    heartbeat as never,
  );
  return {
    service,
    source,
    repository,
    retrieve,
    helper,
    files,
    contents,
    heartbeat,
  };
}
const links = [{ url: 'https://cdn.test/statute.pdf', name: 'Hauptsatzung' }];
const orgId = randomUUID();

describe('CrawledPdfSourcesService', () => {
  it('creates citable file sources in the same knowledge base and does not duplicate them on retry', async () => {
    const { service, source, files, contents } = setup();
    await service.process(source, links, orgId);
    await service.process(source, links, orgId);
    expect(files.size).toBe(1);
    const [file] = files.values();
    expect(file).toMatchObject({
      name: 'Hauptsatzung',
      url: links[0].url,
      knowledgeBaseId: source.knowledgeBaseId,
      status: SourceStatus.READY,
    });
    expect(contents.get(file.id)).toBe('Statute section 1');
  });

  it('does not recreate a deleted file or reprocess an interrupted file when the crawl is redelivered', async () => {
    const { service, source, files, retrieve } = setup();
    await service.process(source, links, orgId);
    files.clear();
    await service.process(source, links, orgId);
    expect(files.size).toBe(0);
    expect(retrieve.execute).toHaveBeenCalledTimes(1);
  });

  it('registers every file before processing and gives overlapping deliveries a single owner', async () => {
    const { service, source, files, retrieve, helper, heartbeat } = setup();
    retrieve.execute.mockImplementation(async () => {
      expect(files.size).toBe(2);
      expect(heartbeat.run).toHaveBeenCalledTimes(2);
      return new UrlRetrieverResult(
        'Statute section 1',
        links[0].url,
        'statute.pdf',
        {},
        [],
        [],
        true,
      );
    });
    const discovered = [
      ...links,
      { url: 'https://cdn.test/fees.pdf', name: 'Fees' },
    ];
    await Promise.all([
      service.process(source, discovered, orgId),
      service.process(source, discovered, orgId),
    ]);
    expect(files.size).toBe(2);
    expect(helper.index).toHaveBeenCalledTimes(2);
  });

  it('records a failed PDF and continues processing the remaining PDFs', async () => {
    const { service, source, retrieve, files } = setup();
    retrieve.execute.mockRejectedValueOnce(
      new TooManyPagesError({ pageCount: 1001, maxPages: 1000 }),
    );
    await service.process(
      source,
      [...links, { url: 'https://cdn.test/fees.pdf', name: 'Gebührenordnung' }],
      orgId,
    );
    expect([...files.values()].map((file) => file.status)).toEqual([
      SourceStatus.FAILED,
      SourceStatus.READY,
    ]);
    expect([...files.values()][0].processingErrorCode).toBe(
      'DOCUMENT_PAGE_LIMIT_EXCEEDED',
    );
    expect(retrieve.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, url: links[0].url }),
    );
  });

  it('continues later PDFs when persisting one PDF failure throws', async () => {
    const { service, source, repository, retrieve, files } = setup();
    retrieve.execute.mockRejectedValueOnce(
      new TooManyPagesError({ pageCount: 1001, maxPages: 1000 }),
    );
    repository.updateStatusConditionally.mockRejectedValueOnce(
      new Error('Database write temporarily unavailable'),
    );
    await expect(
      service.process(
        source,
        [
          ...links,
          { url: 'https://cdn.test/fees.pdf', name: 'Fees' },
          { url: 'https://cdn.test/budget.pdf', name: 'Budget' },
        ],
        orgId,
      ),
    ).resolves.toBeUndefined();
    expect([...files.values()].map((file) => file.status)).toEqual([
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      SourceStatus.READY,
    ]);
    expect(source.status).toBe(SourceStatus.READY);
  });

  it('does not recreate a file deleted during extraction or index its content', async () => {
    const { service, source, retrieve, files, helper } = setup();
    retrieve.execute.mockImplementationOnce(async () => {
      files.clear();
      return new UrlRetrieverResult(
        'section 1',
        links[0].url,
        'statute.pdf',
        {},
        [],
        [],
        true,
      );
    });
    await service.process(source, links, orgId);
    expect(files.size).toBe(0);
    expect(helper.index).not.toHaveBeenCalled();
  });

  it('shows a PDF link that returns an HTML login page as failed', async () => {
    const { service, source, retrieve, files } = setup();
    retrieve.execute.mockResolvedValueOnce(
      new UrlRetrieverResult(
        'Sign in to view this document',
        links[0].url,
        'Sign in',
      ),
    );
    await service.process(source, links, orgId);
    expect([...files.values()][0].status).toBe(SourceStatus.FAILED);
    expect(source.status).toBe(SourceStatus.READY);
  });

  it('does not resurrect a file deleted before a processing failure', async () => {
    const { service, source, retrieve, files } = setup();
    retrieve.execute.mockImplementationOnce(async () => {
      files.clear();
      throw new TooManyPagesError({ pageCount: 1001, maxPages: 1000 });
    });
    await service.process(source, links, orgId);
    expect(files.size).toBe(0);
    expect(source.status).toBe(SourceStatus.READY);
  });

  it('processes only files registered within the knowledge base capacity', async () => {
    const { service, source, repository, retrieve } = setup();
    repository.completeCrawlWithFileSources.mockImplementationOnce(
      async (_id, batch) => batch.slice(0, 1),
    );
    await service.process(
      source,
      [...links, { url: 'https://cdn.test/fees.pdf', name: 'Fees' }],
      orgId,
    );
    expect(retrieve.execute).toHaveBeenCalledTimes(1);
  });

  it.each([null, SourceStatus.FAILED, SourceStatus.PROCESSING])(
    'cleans the HTML index after lost completion when stored status is %s',
    async (status) => {
      const { service, source, repository, helper } = setup();
      const vectors = new Set<string>([source.id]);
      repository.completeCrawlWithFileSources.mockResolvedValueOnce(null);
      repository.findById.mockResolvedValueOnce(
        status ? Object.assign(source, { status }) : null,
      );
      helper.cleanupIndex.mockImplementation(async (id: string) => {
        vectors.delete(id);
      });
      await service.process(source, [], orgId);
      expect(vectors.size).toBe(0);
    },
  );

  it('preserves the winning HTML index after duplicate completion loses', async () => {
    const { service, source, repository, helper } = setup();
    const vectors = new Set<string>([source.id]);
    source.status = SourceStatus.READY;
    repository.completeCrawlWithFileSources.mockResolvedValueOnce(null);
    helper.cleanupIndex.mockImplementation(async (id: string) => {
      vectors.delete(id);
    });
    await service.process(source, [], orgId);
    expect(vectors.has(source.id)).toBe(true);
  });

  it('does not create files for URL sources outside a knowledge base', async () => {
    const { service, source, files } = setup();
    source.knowledgeBaseId = null;
    await service.process(source, links, orgId);
    expect(files.size).toBe(0);
  });
});
