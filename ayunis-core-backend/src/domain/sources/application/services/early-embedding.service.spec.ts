import { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';
import type { UUID } from 'crypto';
import { EarlyEmbeddingService } from './early-embedding.service';
import { RecursiveSplitterHandler } from 'src/domain/rag/splitters/infrastructure/handlers/recursive.splitter';
import type { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import type { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import type { PrepareContentEmbeddingsUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.use-case';
import type { PrepareContentEmbeddingsCommand } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.command';
import { SOURCE_CHUNKING } from 'src/domain/sources/application/util/source-chunking.helper';

import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

const MODEL = {
  id: '11111111-1111-1111-1111-111111111111' as UUID,
  name: 'mistral-embed',
  provider: ModelProvider.MISTRAL,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
};

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function page(number: number): string {
  return Array.from(
    { length: 6 },
    (_, paragraph) =>
      `Seite ${number} Absatz ${paragraph}: ` +
      'Der Ausschuss beraet den Haushaltsansatz und beschliesst die Vorlage. '.repeat(
        6,
      ),
  ).join('\n\n');
}

describe('EarlyEmbeddingService', () => {
  const splitter = new RecursiveSplitterHandler();
  const split = (text: string) =>
    splitter
      .processText({ text, metadata: SOURCE_CHUNKING })
      .chunks.map((chunk) => chunk.text);
  const splitTextUseCase = {
    execute: (command: SplitTextCommand) =>
      splitter.processText({ text: command.text, metadata: command.metadata }),
  } as unknown as SplitTextUseCase;

  let prepared: string[][];
  let prepare: jest.Mock<
    Promise<PreparedContentEmbeddings | undefined>,
    [PrepareContentEmbeddingsCommand]
  >;
  const originalEnv = process.env;

  function service() {
    return new EarlyEmbeddingService(splitTextUseCase, {
      execute: prepare,
    } as unknown as PrepareContentEmbeddingsUseCase);
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.INGESTION_EARLY_EMBEDDING = 'true';
    prepared = [];
    prepare = jest.fn((command) => {
      prepared.push(command.contents);
      return Promise.resolve(
        new PreparedContentEmbeddings(
          MODEL,
          new Map(
            command.contents.map((content) => [content, [content.length]]),
          ),
        ),
      );
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('embeds each chunk once, as soon as later pages can no longer change it, and never the last one', async () => {
    const pages = Array.from({ length: 6 }, (_, index) => page(index + 1));
    const early = service().start(ORG_ID);

    early.appendPages(pages.slice(0, 2));
    early.appendPages(pages.slice(2, 5));
    early.appendPages(pages.slice(5));
    const vectors = await early.finish();

    const final = split(pages.join('\n'));
    const sent = prepared.flat();
    expect(sent).toEqual(final.slice(0, sent.length));
    expect(sent).toHaveLength(final.length - 1);
    expect(new Set(sent).size).toBe(sent.length);
    expect(prepared).toHaveLength(3);
    expect([...vectors!.vectorsByText.keys()]).toEqual(sent);
  });

  it('waits for a blank line before it trusts the cut of the first pages', async () => {
    const early = service().start(ORG_ID);

    early.appendPages(['Zeile '.repeat(900), 'Zeile '.repeat(900)]);
    await early.finish();

    expect(prepare).not.toHaveBeenCalled();
  });

  it('returns only once the requests it started have answered', async () => {
    let answer: () => void = () => undefined;
    prepare.mockImplementationOnce(
      (command) =>
        new Promise((resolve) => {
          answer = () =>
            resolve(
              new PreparedContentEmbeddings(
                MODEL,
                new Map([[command.contents[0], [1]]]),
              ),
            );
        }),
    );
    const early = service().start(ORG_ID);
    early.appendPages([page(1), page(2)]);
    let finished = false;

    const vectors = early.finish().then((result) => {
      finished = true;
      return result;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(finished).toBe(false);

    answer();
    expect((await vectors)?.vectorsByText.size).toBe(1);
  });

  it('does not fail the document when a request fails; it stops and keeps what it has', async () => {
    prepare.mockRejectedValueOnce(new Error('provider unavailable'));
    const early = service().start(ORG_ID);

    early.appendPages([page(1), page(2)]);
    await new Promise((resolve) => setImmediate(resolve));
    early.appendPages([page(3), page(4)]);

    await expect(early.finish()).resolves.toBeUndefined();
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it('starts nothing for pages that arrive after it was finished', async () => {
    const early = service().start(ORG_ID);
    await early.finish();

    early.appendPages([page(1), page(2)]);

    expect(prepare).not.toHaveBeenCalled();
  });

  it('keeps vectors from different model configurations separate across early batches', async () => {
    const changedModel = { ...MODEL, name: 'mistral-embed-v2' };
    prepare
      .mockImplementationOnce(
        async (command) =>
          new PreparedContentEmbeddings(
            MODEL,
            new Map([[command.contents[0], [1]]]),
          ),
      )
      .mockImplementationOnce(
        async (command) =>
          new PreparedContentEmbeddings(
            changedModel,
            new Map([[command.contents[0], [2]]]),
          ),
      );
    const early = service().start(ORG_ID);
    early.appendPages([page(1), page(2)]);
    early.appendPages([page(3), page(4)]);

    const result = await early.finish();

    expect([...result!.vectorsByText.values()]).toEqual([[1]]);
  });

  it('does nothing when INGESTION_EARLY_EMBEDDING is false', async () => {
    process.env.INGESTION_EARLY_EMBEDDING = 'false';
    const early = service().start(ORG_ID);

    early.appendPages([page(1), page(2), page(3)]);

    await expect(early.finish()).resolves.toBeUndefined();
    expect(prepare).not.toHaveBeenCalled();
  });
});
