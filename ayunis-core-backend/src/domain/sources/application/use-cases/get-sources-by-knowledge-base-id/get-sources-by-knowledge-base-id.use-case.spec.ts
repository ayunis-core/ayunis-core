import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetSourcesByKnowledgeBaseIdUseCase } from './get-sources-by-knowledge-base-id.use-case';
import { GetSourcesByKnowledgeBaseIdQuery } from './get-sources-by-knowledge-base-id.query';
import { SourceRepository } from '../../ports/source.repository';
import { randomUUID } from 'crypto';
import { UnexpectedSourceError } from '../../sources.errors';
import type { Source } from '../../../domain/source.entity';

describe('GetSourcesByKnowledgeBaseIdUseCase', () => {
  let useCase: GetSourcesByKnowledgeBaseIdUseCase;
  let mockSourceRepository: Partial<SourceRepository>;

  beforeAll(async () => {
    mockSourceRepository = {
      findByKnowledgeBaseId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSourcesByKnowledgeBaseIdUseCase,
        {
          provide: SourceRepository,
          useValue: mockSourceRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetSourcesByKnowledgeBaseIdUseCase>(
      GetSourcesByKnowledgeBaseIdUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return sources belonging to the knowledge base', async () => {
    const knowledgeBaseId = randomUUID();
    const sourceId = randomUUID();
    const mockSources = [
      { id: sourceId, name: 'Haushaltssatzung_2025.pdf' },
    ] as Source[];

    (mockSourceRepository.findByKnowledgeBaseId as jest.Mock).mockResolvedValue(
      mockSources,
    );

    const result = await useCase.execute(
      new GetSourcesByKnowledgeBaseIdQuery(knowledgeBaseId),
    );

    expect(result).toEqual(mockSources);
    expect(mockSourceRepository.findByKnowledgeBaseId).toHaveBeenCalledWith(
      knowledgeBaseId,
    );
  });

  it('should return empty array when knowledge base has no sources', async () => {
    const knowledgeBaseId = randomUUID();

    (mockSourceRepository.findByKnowledgeBaseId as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await useCase.execute(
      new GetSourcesByKnowledgeBaseIdQuery(knowledgeBaseId),
    );

    expect(result).toEqual([]);
  });

  it('should wrap unexpected errors in UnexpectedSourceError', async () => {
    const knowledgeBaseId = randomUUID();

    (mockSourceRepository.findByKnowledgeBaseId as jest.Mock).mockRejectedValue(
      new Error('Database connection lost'),
    );

    await expect(
      useCase.execute(new GetSourcesByKnowledgeBaseIdQuery(knowledgeBaseId)),
    ).rejects.toThrow(UnexpectedSourceError);
  });
});
