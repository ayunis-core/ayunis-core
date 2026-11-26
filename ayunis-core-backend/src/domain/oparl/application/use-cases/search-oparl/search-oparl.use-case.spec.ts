import type { UUID } from 'crypto';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type { OparlSearchHit } from 'src/domain/oparl/application/models/oparl-search';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import { SearchOparlQuery } from './search-oparl.query';
import { SearchOparlUseCase } from './search-oparl.use-case';

const BODY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as UUID;
const MODEL = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' as UUID,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
};
const chunk = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}` as UUID;

function hit(chunkId: UUID): OparlSearchHit {
  return {
    chunkId,
    source: OparlChunkSource.PAPER,
    text: `Vorlage ${chunkId}`,
    date: '2026-01-07',
    body: { id: BODY, name: 'Gemeinde Musterstadt' },
    paper: null,
    meeting: null,
    agendaItem: null,
    file: null,
  };
}

describe('SearchOparlUseCase', () => {
  function setup(options: {
    model?: typeof MODEL | null;
    embed?: () => Promise<Array<{ vector: number[] }>>;
    fullText?: Record<string, UUID[]>;
    vector?: UUID[];
    /** The passage of a chunk; its own ID when not given. */
    passages?: Record<UUID, string>;
    bodyIds?: UUID[];
  }) {
    const matches = (ids: UUID[] = []) =>
      ids.map((id) => ({ id, passage: options.passages?.[id] ?? id }));
    const reads = {
      fullTextMatches: jest.fn((_scope, text: string) =>
        Promise.resolve(matches(options.fullText?.[text])),
      ),
      vectorMatches: jest.fn(() => Promise.resolve(matches(options.vector))),
      findHits: jest.fn((_scope, ids: UUID[]) =>
        Promise.resolve([...ids].reverse().map(hit)),
      ),
    };
    const embedText = {
      execute: jest.fn(
        options.embed ??
          ((command: { texts: string[] }) =>
            Promise.resolve(command.texts.map(() => ({ vector: [1, 0] })))),
      ),
    };
    const useCase = new SearchOparlUseCase(
      {
        resolve: () => Promise.resolve({ bodyIds: options.bodyIds ?? [BODY] }),
      } as never,
      reads as never,
      {
        currentModel: () =>
          Promise.resolve(options.model === undefined ? MODEL : options.model),
      } as never,
      embedText as never,
    );
    return { useCase, reads, embedText };
  }

  const search = (queries: string[], page?: number) =>
    new SearchOparlQuery(queries, [], { from: '2026-01-01' }, page);

  it('fuses full-text and vector ranks of every query: what more rankings found ranks first, with the queries that found it', async () => {
    const { useCase } = setup({
      fullText: { Kita: [chunk(1), chunk(2)], Kindertagesstätte: [chunk(2)] },
      vector: [chunk(3), chunk(2)],
    });

    const outcome = await useCase.execute(
      search(['Kita', 'Kindertagesstätte']),
    );

    expect(outcome.mode).toBe('hybrid');
    expect(outcome.results.map((result) => result.chunkId)).toEqual([
      chunk(2),
      chunk(3),
      chunk(1),
    ]);
    expect(outcome.results[0].matchedQueries).toEqual([
      'Kita',
      'Kindertagesstätte',
    ]);
  });

  it('returns one result per passage: the best-ranked chunk of a document page, with the queries that found any of its chunks', async () => {
    const protocolPage = 'file:protocol:3';
    const { useCase } = setup({
      fullText: {
        Friedhof: [chunk(1), chunk(2), chunk(3)],
        Bestattung: [chunk(3)],
      },
      passages: { [chunk(1)]: protocolPage, [chunk(3)]: protocolPage },
    });

    const outcome = await useCase.execute(search(['Friedhof', 'Bestattung']));

    expect(
      outcome.results.map(({ chunkId, matchedQueries }) => ({
        chunkId,
        matchedQueries,
      })),
    ).toEqual([
      { chunkId: chunk(3), matchedQueries: ['Friedhof', 'Bestattung'] },
      { chunkId: chunk(2), matchedQueries: ['Friedhof'] },
    ]);
  });

  it('pages through the same ranking: a later page goes on where the one before ended and tells when nothing follows', async () => {
    const ranked = Array.from({ length: 12 }, (_, index) => chunk(index + 1));
    const { useCase } = setup({ fullText: { Friedhof: ranked } });

    const first = await useCase.execute(search(['Friedhof']));
    const second = await useCase.execute(search(['Friedhof'], 2));

    expect(first.results.map((result) => result.chunkId)).toEqual(
      ranked.slice(0, 10),
    );
    expect(first).toMatchObject({ page: 1, hasMore: true });
    expect(second.results.map((result) => result.chunkId)).toEqual(
      ranked.slice(10),
    );
    expect(second).toMatchObject({ page: 2, hasMore: false });
  });

  it('searches full text only while no OParl embedding model is set', async () => {
    const { useCase, reads, embedText } = setup({
      model: null,
      fullText: { Kita: [chunk(1)] },
    });

    const outcome = await useCase.execute(search(['Kita']));

    expect(outcome).toMatchObject({
      mode: 'full_text',
      results: [{ chunkId: chunk(1) }],
    });
    expect(embedText.execute).not.toHaveBeenCalled();
    expect(reads.vectorMatches).not.toHaveBeenCalled();
  });

  it('falls back to full text when the embedding provider fails', async () => {
    const { useCase } = setup({
      embed: () =>
        Promise.reject(
          new ProviderTimeoutError({ provider: 'mistral', modelId: 'embed' }),
        ),
      fullText: { Kita: [chunk(1)] },
    });

    const outcome = await useCase.execute(search(['Kita']));

    expect(outcome).toMatchObject({
      mode: 'full_text',
      results: [{ chunkId: chunk(1) }],
    });
  });

  it('finds nothing when none of the requested bodies is linked', async () => {
    const { useCase, reads } = setup({ bodyIds: [] });

    expect(await useCase.execute(search(['Kita']))).toEqual({
      results: [],
      page: 1,
      hasMore: false,
      mode: 'full_text',
    });
    expect(reads.fullTextMatches).not.toHaveBeenCalled();
  });
});
