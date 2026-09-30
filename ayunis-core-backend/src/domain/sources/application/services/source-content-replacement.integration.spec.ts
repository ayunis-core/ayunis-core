import { randomUUID } from 'crypto';
import type { DataSource } from 'typeorm';
import {
  SourceRecord,
  TextSourceRecord,
} from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import {
  FileSourceDetailsRecord,
  TextSourceDetailsRecord,
} from 'src/domain/sources/infrastructure/persistence/local/schema/text-source-details.record';
import { SourceContentChunkRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source-content-chunk.record';
import {
  createSourcePostgresHarness,
  type SourcePostgresHarness,
} from 'src/domain/sources/application/testing/source-postgres.harness';
import type { SourceContentReplacementService } from 'src/domain/sources/application/services/source-content-replacement.service';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import {
  FileType,
  SourceType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

const ORG_ID = randomUUID();

function chunksFor(...contents: string[]): TextSourceContentChunk[] {
  return contents.map(
    (content) =>
      new TextSourceContentChunk({ content, meta: { fileName: 'plan.pdf' } }),
  );
}

describe('Source content replacement (Postgres)', () => {
  let harness: SourcePostgresHarness;
  let dataSource: DataSource;
  let txHost: SourcePostgresHarness['txHost'];
  let sourceRepository: SourcePostgresHarness['sourceRepository'];
  let indexRepository: SourcePostgresHarness['indexRepository'];
  let service: SourceContentReplacementService;
  let embedTextUseCase: { execute: SourcePostgresHarness['embedText'] };
  let storedContent: SourcePostgresHarness['storedContent'];

  beforeAll(async () => {
    harness = await createSourcePostgresHarness(ORG_ID);
    ({ dataSource, txHost, sourceRepository, indexRepository, storedContent } =
      harness);
    service = harness.contentReplacement;
    embedTextUseCase = { execute: harness.embedText };
  });

  afterAll(async () => {
    await harness.destroy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function processingSource(): FileSource {
    return new FileSource({
      name: 'Bebauungsplan.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.PROCESSING,
    });
  }

  // Processing pipelines always commit onto a row created beforehand.
  async function newSource(): Promise<FileSource> {
    const source = processingSource();
    await sourceRepository.save(source);
    return source;
  }

  async function writeContent(
    source: FileSource,
    text: string,
    chunks: TextSourceContentChunk[],
  ): Promise<void> {
    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text,
      chunks,
    });
    await service.commit(source, prepared);
  }

  it('writes text, chunks and index entries on initial ingestion', async () => {
    const source = await newSource();

    await writeContent(
      source,
      'Fassung 2024',
      chunksFor('Abschnitt A 2024', 'Abschnitt B 2024'),
    );

    const stored = await storedContent(source.id);
    expect(stored.texts).toEqual(['Fassung 2024']);
    expect(stored.chunkContents).toEqual([
      'Abschnitt A 2024',
      'Abschnitt B 2024',
    ]);
    expect(stored.indexedChunkIds).toEqual(
      [...stored.chunkIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(stored.childCount).toBe(2);
  });

  it('leaves exactly one set of chunks and index entries after a second write', async () => {
    const source = await newSource();
    await writeContent(
      source,
      'Fassung 2024',
      chunksFor('Abschnitt A 2024', 'Abschnitt B 2024'),
    );

    await writeContent(
      source,
      'Fassung 2025',
      chunksFor('Abschnitt A 2025', 'Abschnitt B 2025', 'Abschnitt C 2025'),
    );

    const stored = await storedContent(source.id);
    expect(stored.texts).toEqual(['Fassung 2025']);
    expect(stored.chunkContents).toEqual([
      'Abschnitt A 2025',
      'Abschnitt B 2025',
      'Abschnitt C 2025',
    ]);
    expect(stored.indexedContents).toEqual(stored.chunkContents);
    expect(stored.indexedChunkIds).toEqual(
      [...stored.chunkIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(stored.childCount).toBe(3);
  });

  it('keeps the previous text, chunks and index when the index insert fails after the delete', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const before = await storedContent(source.id);
    const deleteSpy = jest.spyOn(indexRepository, 'delete');
    jest
      .spyOn(indexRepository, 'saveMany')
      .mockRejectedValueOnce(new Error('connection reset while inserting'));

    await expect(
      writeContent(source, 'Fassung 2025', chunksFor('Abschnitt A 2025')),
    ).rejects.toThrow();

    expect(deleteSpy).toHaveBeenCalledWith(source.id);
    await expect(storedContent(source.id)).resolves.toEqual(before);
  });

  it('embeds with no transaction open and keeps the previous content when embedding fails', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const before = await storedContent(source.id);
    let transactionOpenDuringEmbedding: boolean | undefined;
    embedTextUseCase.execute.mockImplementationOnce(async () => {
      transactionOpenDuringEmbedding = txHost.isTransactionActive();
      throw new Error('embedding provider unavailable');
    });

    await expect(
      writeContent(source, 'Fassung 2025', chunksFor('Abschnitt A 2025')),
    ).rejects.toThrow('embedding provider unavailable');

    expect(transactionOpenDuringEmbedding).toBe(false);
    await expect(storedContent(source.id)).resolves.toEqual(before);
  });

  it('removes all previous chunks and index entries when the new content is empty', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));

    await writeContent(source, '', []);

    await expect(storedContent(source.id)).resolves.toEqual({
      texts: [''],
      chunkContents: [],
      chunkIds: [],
      indexedChunkIds: [],
      indexedContents: [],
      childCount: 0,
    });
  });

  it('replaces content whose details row predates the source-id keyed details', async () => {
    const source = processingSource();
    const sourceRecord = new TextSourceRecord();
    Object.assign(sourceRecord, {
      id: source.id,
      name: source.name,
      type: SourceType.TEXT,
      textType: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.PROCESSING,
    });
    await dataSource.getRepository(SourceRecord).save(sourceRecord);
    const legacyDetails = new FileSourceDetailsRecord();
    Object.assign(legacyDetails, {
      id: randomUUID(),
      source: sourceRecord,
      text: 'Fassung 2019',
      fileType: FileType.PDF,
    });
    await dataSource.getRepository(TextSourceDetailsRecord).save(legacyDetails);
    const legacyChunk = new SourceContentChunkRecord();
    Object.assign(legacyChunk, {
      id: randomUUID(),
      source: legacyDetails,
      content: 'Abschnitt A 2019',
      meta: {},
    });
    await dataSource.getRepository(SourceContentChunkRecord).save(legacyChunk);

    await writeContent(source, 'Fassung 2025', chunksFor('Abschnitt A 2025'));

    const stored = await storedContent(source.id);
    expect(stored.texts).toEqual(['Fassung 2025']);
    expect(stored.chunkContents).toEqual(['Abschnitt A 2025']);
    expect(stored.indexedChunkIds).toEqual(stored.chunkIds);
  });

  it('writes nothing when the source was deleted before the commit', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Fassung 2025',
      chunks: chunksFor('Abschnitt A 2025'),
    });
    await dataSource.getRepository(SourceRecord).delete({ id: source.id });

    await expect(service.commit(source, prepared)).resolves.toBeNull();

    await expect(
      dataSource.getRepository(SourceRecord).existsBy({ id: source.id }),
    ).resolves.toBe(false);
    await expect(storedContent(source.id)).resolves.toEqual({
      texts: [],
      chunkContents: [],
      chunkIds: [],
      indexedChunkIds: [],
      indexedContents: [],
      childCount: 0,
    });
  });

  it('leaves exactly one set of content when two commits for a source overlap', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const first = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Fassung 2025 (Lauf 1)',
      chunks: chunksFor('Lauf 1 Abschnitt A', 'Lauf 1 Abschnitt B'),
    });
    const second = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Fassung 2025 (Lauf 2)',
      chunks: chunksFor('Lauf 2 Abschnitt A'),
    });

    const results = await Promise.allSettled([
      service.commit(source, first),
      service.commit(source, second),
    ]);

    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    const stored = await storedContent(source.id);
    expect(stored.texts).toHaveLength(1);
    const winner = stored.texts[0].includes('Lauf 1') ? 'Lauf 1' : 'Lauf 2';
    expect(
      stored.chunkContents.every((content) => content.startsWith(winner)),
    ).toBe(true);
    expect(stored.indexedChunkIds).toEqual(
      [...stored.chunkIds].sort((a, b) => a.localeCompare(b)),
    );
  });
});
