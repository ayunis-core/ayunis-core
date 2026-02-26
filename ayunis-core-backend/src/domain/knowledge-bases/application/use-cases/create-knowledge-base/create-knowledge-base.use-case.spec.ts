import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateKnowledgeBaseUseCase } from './create-knowledge-base.use-case';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';
import type { UUID } from 'crypto';

describe('CreateKnowledgeBaseUseCase', () => {
  let useCase: CreateKnowledgeBaseUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get(CreateKnowledgeBaseUseCase);
  });

  it('should create a knowledge base with name and description', async () => {
    const command = new CreateKnowledgeBaseCommand({
      name: 'Stadtratsprotokolle 2025',
      description: 'Sammlung aller Protokolle',
      userId,
      orgId,
    });

    mockRepository.save.mockImplementation(async (kb) => kb);

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(KnowledgeBase);
    expect(result.name).toBe('Stadtratsprotokolle 2025');
    expect(result.description).toBe('Sammlung aller Protokolle');
    expect(result.orgId).toBe(orgId);
    expect(result.userId).toBe(userId);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should create a knowledge base with empty description when not provided', async () => {
    const command = new CreateKnowledgeBaseCommand({
      name: 'Haushaltspläne',
      userId,
      orgId,
    });

    mockRepository.save.mockImplementation(async (kb) => kb);

    const result = await useCase.execute(command);

    expect(result.description).toBe('');
  });

  it('should wrap unexpected repository errors into UnexpectedKnowledgeBaseError', async () => {
    const command = new CreateKnowledgeBaseCommand({
      name: 'Fehlerhafter Versuch',
      userId,
      orgId,
    });

    mockRepository.save.mockRejectedValue(new Error('Connection refused'));

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
  });
});
