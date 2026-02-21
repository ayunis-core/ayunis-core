import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindKnowledgeBaseUseCase } from './find-knowledge-base.use-case';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import type { UUID } from 'crypto';

describe('FindKnowledgeBaseUseCase', () => {
  let useCase: FindKnowledgeBaseUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get(FindKnowledgeBaseUseCase);
  });

  it('should return a knowledge base when found and owned by user', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      description: 'Protokolle des Stadtrats',
      orgId,
      userId,
    });

    mockRepository.findById.mockResolvedValue(existing);

    const query = new FindKnowledgeBaseQuery(knowledgeBaseId, userId);
    const result = await useCase.execute(query);

    expect(result).toBe(existing);
    expect(mockRepository.findById).toHaveBeenCalledWith(knowledgeBaseId);
  });

  it('should throw KnowledgeBaseNotFoundError when not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const query = new FindKnowledgeBaseQuery(knowledgeBaseId, userId);

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should throw KnowledgeBaseNotFoundError when owned by another user', async () => {
    const otherUserId = '44444444-4444-4444-4444-444444444444' as UUID;
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Fremde Wissensbasis',
      orgId,
      userId: otherUserId,
    });

    mockRepository.findById.mockResolvedValue(existing);

    const query = new FindKnowledgeBaseQuery(knowledgeBaseId, userId);

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should wrap unexpected repository errors into UnexpectedKnowledgeBaseError', async () => {
    mockRepository.findById.mockRejectedValue(new Error('Connection refused'));

    const query = new FindKnowledgeBaseQuery(knowledgeBaseId, userId);

    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
  });
});
