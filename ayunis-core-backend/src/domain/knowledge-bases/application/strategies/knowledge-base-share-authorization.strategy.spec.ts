import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { KnowledgeBaseShareAuthorizationStrategy } from './knowledge-base-share-authorization.strategy';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';
import type { KnowledgeBase } from '../../domain/knowledge-base.entity';
import { randomUUID } from 'crypto';

describe('KnowledgeBaseShareAuthorizationStrategy', () => {
  let strategy: KnowledgeBaseShareAuthorizationStrategy;
  let knowledgeBaseRepository: jest.Mocked<KnowledgeBaseRepository>;

  beforeAll(async () => {
    const mockKnowledgeBaseRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseShareAuthorizationStrategy,
        {
          provide: KnowledgeBaseRepository,
          useValue: mockKnowledgeBaseRepository,
        },
      ],
    }).compile();

    strategy = module.get<KnowledgeBaseShareAuthorizationStrategy>(
      KnowledgeBaseShareAuthorizationStrategy,
    );
    knowledgeBaseRepository = module.get(KnowledgeBaseRepository);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canViewShares', () => {
    it('should return true when user owns the knowledge base', async () => {
      const kbId = randomUUID();
      const userId = randomUUID();
      const mockKb = { id: kbId, userId } as KnowledgeBase;

      knowledgeBaseRepository.findById.mockResolvedValue(mockKb);

      const result = await strategy.canViewShares(kbId, userId);

      expect(result).toBe(true);
      expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(kbId);
    });

    it('should return false when knowledge base does not exist', async () => {
      const kbId = randomUUID();
      const userId = randomUUID();

      knowledgeBaseRepository.findById.mockResolvedValue(null);

      const result = await strategy.canViewShares(kbId, userId);

      expect(result).toBe(false);
      expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(kbId);
    });

    it('should return false when user does not own the knowledge base', async () => {
      const kbId = randomUUID();
      const userId = randomUUID();
      const otherUserId = randomUUID();
      const mockKb = { id: kbId, userId: otherUserId } as KnowledgeBase;

      knowledgeBaseRepository.findById.mockResolvedValue(mockKb);

      const result = await strategy.canViewShares(kbId, userId);

      expect(result).toBe(false);
      expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(kbId);
    });
  });

  describe('canCreateShare', () => {
    it('should return true when user owns the knowledge base', async () => {
      const kbId = randomUUID();
      const userId = randomUUID();
      const mockKb = { id: kbId, userId } as KnowledgeBase;

      knowledgeBaseRepository.findById.mockResolvedValue(mockKb);

      const result = await strategy.canCreateShare(kbId, userId);

      expect(result).toBe(true);
      expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(kbId);
    });

    it('should return false when knowledge base does not exist', async () => {
      const kbId = randomUUID();
      const userId = randomUUID();

      knowledgeBaseRepository.findById.mockResolvedValue(null);

      const result = await strategy.canCreateShare(kbId, userId);

      expect(result).toBe(false);
      expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(kbId);
    });

    it('should return false when user does not own the knowledge base', async () => {
      const kbId = randomUUID();
      const userId = randomUUID();
      const otherUserId = randomUUID();
      const mockKb = { id: kbId, userId: otherUserId } as KnowledgeBase;

      knowledgeBaseRepository.findById.mockResolvedValue(mockKb);

      const result = await strategy.canCreateShare(kbId, userId);

      expect(result).toBe(false);
      expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(kbId);
    });
  });

  describe('canDeleteShare', () => {
    it('should always return true since deletion auth is handled at share level', async () => {
      const shareId = randomUUID();
      const userId = randomUUID();

      const result = await strategy.canDeleteShare(shareId, userId);

      expect(result).toBe(true);
      expect(knowledgeBaseRepository.findById).not.toHaveBeenCalled();
    });

    it('should return true regardless of user or share', async () => {
      const result1 = await strategy.canDeleteShare(randomUUID(), randomUUID());
      const result2 = await strategy.canDeleteShare(randomUUID(), randomUUID());

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(knowledgeBaseRepository.findById).not.toHaveBeenCalled();
    });
  });
});
