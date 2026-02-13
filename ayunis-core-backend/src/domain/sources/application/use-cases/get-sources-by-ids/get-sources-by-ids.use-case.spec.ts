import { GetSourcesByIdsUseCase } from './get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from './get-sources-by-ids.query';
import { SourceRepository } from '../../ports/source.repository';
import { UUID, randomUUID } from 'crypto';
import { SourceType } from '../../../domain/source-type.enum';
import { Source } from '../../../domain/source.entity';
import { SourceCreator } from '../../../domain/source-creator.enum';
import { UnexpectedSourceError } from '../../sources.errors';

class StubSource extends Source {
  constructor(id: UUID) {
    super({
      id,
      type: SourceType.TEXT,
      name: 'Test Source',
      createdBy: SourceCreator.USER,
    });
  }
}

describe('GetSourcesByIdsUseCase', () => {
  let useCase: GetSourcesByIdsUseCase;
  let sourceRepository: jest.Mocked<SourceRepository>;

  beforeEach(() => {
    sourceRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as jest.Mocked<SourceRepository>;

    useCase = new GetSourcesByIdsUseCase(sourceRepository);
  });

  it('should return sources matching the provided IDs', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    const sources = [new StubSource(id1), new StubSource(id2)];
    sourceRepository.findByIds.mockResolvedValue(sources);

    const result = await useCase.execute(new GetSourcesByIdsQuery([id1, id2]));

    expect(result).toEqual(sources);
    expect(sourceRepository.findByIds).toHaveBeenCalledWith([id1, id2]);
  });

  it('should return an empty array when no IDs are provided', async () => {
    const result = await useCase.execute(
      new GetSourcesByIdsQuery([] as UUID[]),
    );

    expect(result).toEqual([]);
    expect(sourceRepository.findByIds).not.toHaveBeenCalled();
  });

  it('should throw UnexpectedSourceError when repository fails', async () => {
    sourceRepository.findByIds.mockRejectedValue(
      new Error('Database connection lost'),
    );

    await expect(
      useCase.execute(new GetSourcesByIdsQuery([randomUUID()])),
    ).rejects.toThrow(UnexpectedSourceError);
  });
});
