import type { UUID } from 'crypto';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceContentDegradedError } from 'src/domain/sources/application/sources.errors';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentDegradationGuard } from './source-content-degradation-guard.service';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;

function pages(count: number): TextSourceContentChunk[] {
  return Array.from({ length: count }, (_, index) => [
    new TextSourceContentChunk({
      content: `Seite ${index}, Teil 1`,
      meta: { url: `https://www.stadt.example/seite-${index}` },
    }),
    new TextSourceContentChunk({
      content: `Seite ${index}, Teil 2`,
      meta: { url: `https://www.stadt.example/seite-${index}` },
    }),
  ]).flat();
}

describe('SourceContentDegradationGuard', () => {
  let sourceRepository: jest.Mocked<SourceRepository>;
  let guard: SourceContentDegradationGuard;

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    guard = new SourceContentDegradationGuard(sourceRepository);
  });

  it.each([
    [10, 4],
    [3, 1],
    [40, 1],
  ])(
    'rejects a run that keeps fewer than half of %i previous pages (%i found)',
    async (previous, current) => {
      sourceRepository.countIndexedPages.mockResolvedValue(previous);

      await expect(
        guard.assertNotDegraded(SOURCE_ID, pages(current)),
      ).rejects.toThrow(SourceContentDegradedError);
    },
  );

  it.each([
    [10, 5],
    [10, 12],
    [2, 1],
  ])(
    'accepts a run that keeps at least half of %i previous pages (%i found)',
    async (previous, current) => {
      sourceRepository.countIndexedPages.mockResolvedValue(previous);

      await expect(
        guard.assertNotDegraded(SOURCE_ID, pages(current)),
      ).resolves.toBeUndefined();
    },
  );

  it.each([0, 1])(
    'accepts any run when only %i page was indexed before',
    async (previous) => {
      sourceRepository.countIndexedPages.mockResolvedValue(previous);

      await expect(
        guard.assertNotDegraded(SOURCE_ID, []),
      ).resolves.toBeUndefined();
    },
  );

  it('counts pages, not chunks', async () => {
    sourceRepository.countIndexedPages.mockResolvedValue(4);

    await expect(guard.assertNotDegraded(SOURCE_ID, pages(1))).rejects.toThrow(
      SourceContentDegradedError,
    );
  });

  it('does not count chunks without a page url as a page, as the stored count does not', async () => {
    sourceRepository.countIndexedPages.mockResolvedValue(2);
    const unpaged = new TextSourceContentChunk({
      content: 'Impressum',
      meta: {},
    });

    await expect(guard.assertNotDegraded(SOURCE_ID, [unpaged])).rejects.toThrow(
      SourceContentDegradedError,
    );
  });
});
