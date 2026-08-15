import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import { FindUnreferencedSourceIdsUseCase } from './find-unreferenced-source-ids.use-case';
import { FindUnreferencedSourceIdsQuery } from './find-unreferenced-source-ids.query';
import type { SourceRepository } from '../../ports/source.repository';
import { createMockSourceRepository } from '../../testing/source.fixtures';
import { UnexpectedSourceError } from '../../sources.errors';

describe('FindUnreferencedSourceIdsUseCase', () => {
  let useCase: FindUnreferencedSourceIdsUseCase;
  let sourceRepository: jest.Mocked<SourceRepository>;

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();

    useCase = new FindUnreferencedSourceIdsUseCase(
      createPinoLoggerMock(),
      sourceRepository,
    );
  });

  it('returns the subset reported by the repository', async () => {
    const keep = randomUUID();
    const drop = randomUUID();
    const olderThan = new Date('2026-01-01T00:00:00Z');
    sourceRepository.findUnreferencedIds.mockResolvedValue([drop]);

    const result = await useCase.execute(
      new FindUnreferencedSourceIdsQuery([keep, drop], olderThan),
    );

    expect(result).toEqual([drop]);
    expect(sourceRepository.findUnreferencedIds).toHaveBeenCalledWith(
      [keep, drop],
      olderThan,
    );
  });

  it('short-circuits on empty candidate list without hitting the repository', async () => {
    const result = await useCase.execute(
      new FindUnreferencedSourceIdsQuery([] as UUID[], new Date()),
    );

    expect(result).toEqual([]);
    expect(sourceRepository.findUnreferencedIds).not.toHaveBeenCalled();
  });

  it('wraps unexpected repository errors in UnexpectedSourceError', async () => {
    sourceRepository.findUnreferencedIds.mockRejectedValue(new Error('boom'));

    await expect(
      useCase.execute(
        new FindUnreferencedSourceIdsQuery([randomUUID()], new Date()),
      ),
    ).rejects.toThrow(UnexpectedSourceError);
  });
});
