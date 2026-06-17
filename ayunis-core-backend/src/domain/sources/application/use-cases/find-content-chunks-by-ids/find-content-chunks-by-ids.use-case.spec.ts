import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindContentChunksByIdsUseCase } from './find-content-chunks-by-ids.use-case';
import { FindContentChunksByIdsQuery } from './find-content-chunks-by-ids.query';
import { SourceRepository } from '../../ports/source.repository';
import { randomUUID } from 'crypto';
import { TextSourceContentChunk } from '../../../domain/source-content-chunk.entity';
import { UnexpectedSourceError } from '../../sources.errors';
import type { UUID } from 'crypto';

describe('FindContentChunksByIdsUseCase', () => {
  let useCase: FindContentChunksByIdsUseCase;
  let mockSourceRepository: Partial<SourceRepository>;

  beforeAll(async () => {
    mockSourceRepository = {
      findContentChunksByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindContentChunksByIdsUseCase,
        {
          provide: SourceRepository,
          useValue: mockSourceRepository,
        },
      ],
    }).compile();

    useCase = module.get<FindContentChunksByIdsUseCase>(
      FindContentChunksByIdsUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return content chunks with source metadata', async () => {
    const chunkId = randomUUID();
    const sourceId = randomUUID();
    const chunk = new TextSourceContentChunk({
      id: chunkId,
      content: 'Municipal zoning regulation section 4.2',
      meta: { lineStart: 1, lineEnd: 10 },
    });
    const expected = [
      { chunk, sourceId, sourceName: 'Zoning Regulations 2025.pdf' },
    ];

    (
      mockSourceRepository.findContentChunksByIds as jest.Mock
    ).mockResolvedValue(expected);

    const result = await useCase.execute(
      new FindContentChunksByIdsQuery([chunkId]),
    );

    expect(result).toEqual(expected);
    expect(mockSourceRepository.findContentChunksByIds).toHaveBeenCalledWith([
      chunkId,
    ]);
  });

  it('should return empty array when no chunk IDs provided', async () => {
    const result = await useCase.execute(
      new FindContentChunksByIdsQuery([] as UUID[]),
    );

    expect(result).toEqual([]);
    expect(mockSourceRepository.findContentChunksByIds).not.toHaveBeenCalled();
  });

  it('should wrap unexpected errors in UnexpectedSourceError', async () => {
    const chunkId = randomUUID();

    (
      mockSourceRepository.findContentChunksByIds as jest.Mock
    ).mockRejectedValue(new Error('Database connection lost'));

    await expect(
      useCase.execute(new FindContentChunksByIdsQuery([chunkId])),
    ).rejects.toThrow(UnexpectedSourceError);
  });
});
