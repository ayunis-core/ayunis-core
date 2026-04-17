import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { FindUnreferencedSourceIdsUseCase } from './find-unreferenced-source-ids.use-case';
import { FindUnreferencedSourceIdsQuery } from './find-unreferenced-source-ids.query';
import type { SourceRepository } from '../../ports/source.repository';
import { UnexpectedSourceError } from '../../sources.errors';

describe('FindUnreferencedSourceIdsUseCase', () => {
  let useCase: FindUnreferencedSourceIdsUseCase;
  let sourceRepository: jest.Mocked<SourceRepository>;

  beforeEach(() => {
    sourceRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByKnowledgeBaseId: jest.fn(),
      saveTextSource: jest.fn(),
      findStaleProcessingSources: jest.fn(),
      save: jest.fn(),
      extractTextLines: jest.fn(),
      findContentChunksByIds: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateStatusConditionally: jest.fn(),
      findUnreferencedIds: jest.fn(),
    } as jest.Mocked<SourceRepository>;

    useCase = new FindUnreferencedSourceIdsUseCase(sourceRepository);
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
