import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetKnowledgeBasesByIdsUseCase } from './get-knowledge-bases-by-ids.use-case';
import { GetKnowledgeBasesByIdsQuery } from './get-knowledge-bases-by-ids.query';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('GetKnowledgeBasesByIdsUseCase', () => {
  let useCase: GetKnowledgeBasesByIdsUseCase;
  let knowledgeBaseRepository: jest.Mocked<KnowledgeBaseRepository>;
  let contextService: jest.Mocked<ContextService>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockKbId1 = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockKbId2 = '123e4567-e89b-12d3-a456-426614174011' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetKnowledgeBasesByIdsUseCase,
        {
          provide: KnowledgeBaseRepository,
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'orgId') return mockOrgId;
              if (key === 'userId') return mockUserId;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetKnowledgeBasesByIdsUseCase);
    knowledgeBaseRepository = module.get(KnowledgeBaseRepository);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  const createKnowledgeBase = (
    id: UUID,
    name: string,
    orgId: UUID = mockOrgId,
  ): KnowledgeBase =>
    new KnowledgeBase({
      id,
      name,
      description: `Description for ${name}`,
      orgId,
      userId: mockUserId,
    });

  describe('execute', () => {
    it('should return knowledge bases matching the provided IDs', async () => {
      const kb1 = createKnowledgeBase(mockKbId1, 'Legal KB');
      const kb2 = createKnowledgeBase(mockKbId2, 'HR KB');
      knowledgeBaseRepository.findByIds.mockResolvedValue([kb1, kb2]);

      const result = await useCase.execute(
        new GetKnowledgeBasesByIdsQuery([mockKbId1, mockKbId2]),
      );

      expect(knowledgeBaseRepository.findByIds).toHaveBeenCalledWith([
        mockKbId1,
        mockKbId2,
      ]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(kb1);
      expect(result[1]).toBe(kb2);
    });

    it('should filter out knowledge bases from other organizations', async () => {
      const otherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
      const kb1 = createKnowledgeBase(mockKbId1, 'Own Org KB', mockOrgId);
      const kb2 = createKnowledgeBase(mockKbId2, 'Other Org KB', otherOrgId);
      knowledgeBaseRepository.findByIds.mockResolvedValue([kb1, kb2]);

      const result = await useCase.execute(
        new GetKnowledgeBasesByIdsQuery([mockKbId1, mockKbId2]),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(kb1);
    });

    it('should return empty array when given empty IDs', async () => {
      const result = await useCase.execute(new GetKnowledgeBasesByIdsQuery([]));

      expect(knowledgeBaseRepository.findByIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedAccessError when orgId is missing', async () => {
      contextService.get.mockReturnValue(null);

      await expect(
        useCase.execute(new GetKnowledgeBasesByIdsQuery([mockKbId1])),
      ).rejects.toThrow(UnauthorizedAccessError);

      expect(knowledgeBaseRepository.findByIds).not.toHaveBeenCalled();
    });

    it('should wrap unexpected errors in UnexpectedKnowledgeBaseError', async () => {
      knowledgeBaseRepository.findByIds.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        useCase.execute(new GetKnowledgeBasesByIdsQuery([mockKbId1])),
      ).rejects.toThrow(UnexpectedKnowledgeBaseError);
    });

    it('should rethrow ApplicationError without wrapping', async () => {
      const appError = new UnauthorizedAccessError();
      contextService.get.mockImplementation(() => {
        throw appError;
      });

      await expect(
        useCase.execute(new GetKnowledgeBasesByIdsQuery([mockKbId1])),
      ).rejects.toThrow(appError);
    });
  });
});
