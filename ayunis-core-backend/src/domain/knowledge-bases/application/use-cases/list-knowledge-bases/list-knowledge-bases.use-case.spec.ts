import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListKnowledgeBasesUseCase } from './list-knowledge-bases.use-case';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';
import type { UUID } from 'crypto';

describe('ListKnowledgeBasesUseCase', () => {
  let useCase: ListKnowledgeBasesUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;

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
        ListKnowledgeBasesUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get(ListKnowledgeBasesUseCase);
  });

  it('should return all knowledge bases for the current user', async () => {
    const kb1 = new KnowledgeBase({
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    const kb2 = new KnowledgeBase({
      name: 'Haushaltspläne',
      orgId,
      userId,
    });

    mockRepository.findAllByUserId.mockResolvedValue([kb1, kb2]);

    const result = await useCase.execute(new ListKnowledgeBasesQuery(userId));

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Stadtratsprotokolle 2025');
    expect(result[1].name).toBe('Haushaltspläne');
    expect(mockRepository.findAllByUserId).toHaveBeenCalledWith(userId);
  });

  it('should return empty array when user has no knowledge bases', async () => {
    mockRepository.findAllByUserId.mockResolvedValue([]);

    const result = await useCase.execute(new ListKnowledgeBasesQuery(userId));

    expect(result).toHaveLength(0);
    expect(mockRepository.findAllByUserId).toHaveBeenCalledWith(userId);
  });

  it('should wrap unexpected repository errors into UnexpectedKnowledgeBaseError', async () => {
    mockRepository.findAllByUserId.mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      useCase.execute(new ListKnowledgeBasesQuery(userId)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
