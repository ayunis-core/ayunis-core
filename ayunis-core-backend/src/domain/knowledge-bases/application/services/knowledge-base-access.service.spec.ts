import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { KnowledgeBaseAccessService } from './knowledge-base-access.service';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { CheckKnowledgeBaseSkillShareAccessUseCase } from 'src/domain/skills/application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.use-case';
import { FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase } from 'src/domain/skills/application/use-cases/find-knowledge-base-ids-accessible-via-shared-skills/find-knowledge-base-ids-accessible-via-shared-skills.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Share } from 'src/domain/shares/domain/share.entity';
import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';

describe('KnowledgeBaseAccessService', () => {
  let service: KnowledgeBaseAccessService;
  let knowledgeBaseRepository: jest.Mocked<KnowledgeBaseRepository>;
  let findShareByEntityUseCase: jest.Mocked<FindShareByEntityUseCase>;
  let findSharesByScopeUseCase: jest.Mocked<FindSharesByScopeUseCase>;
  let checkKnowledgeBaseSkillShareAccessUseCase: jest.Mocked<CheckKnowledgeBaseSkillShareAccessUseCase>;
  let findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase: jest.Mocked<FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const otherUserId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
  const orgId = '333e4567-e89b-12d3-a456-426614174002' as UUID;
  const kbId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const makeKb = (id: UUID = kbId, owner: UUID = userId) =>
    new KnowledgeBase({
      id,
      name: 'Test KB',
      description: 'Test description',
      orgId,
      userId: owner,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseAccessService,
        {
          provide: getLoggerToken(KnowledgeBaseAccessService.name),
          useValue: createPinoLoggerMock(),
        },
        {
          provide: KnowledgeBaseRepository,
          useValue: {
            findById: jest.fn(),
            findByIds: jest.fn(),
            findAllByUserId: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            isActive: jest.fn().mockResolvedValue(false),
            getActiveIds: jest.fn().mockResolvedValue(new Set()),
            findActiveAccessible: jest.fn(),
            findPaginatedAccessible: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            assignSourceToKnowledgeBase: jest.fn(),
            findSourcesByKnowledgeBaseId: jest.fn(),
            countSourcesByKnowledgeBaseIds: jest.fn(),
            findSourceByIdAndKnowledgeBaseId: jest.fn(),
          },
        },
        {
          provide: FindShareByEntityUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindSharesByScopeUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CheckKnowledgeBaseSkillShareAccessUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'userId') return userId;
              if (key === 'orgId') return orgId;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(KnowledgeBaseAccessService);
    knowledgeBaseRepository = module.get(KnowledgeBaseRepository);
    findShareByEntityUseCase = module.get(FindShareByEntityUseCase);
    findSharesByScopeUseCase = module.get(FindSharesByScopeUseCase);
    checkKnowledgeBaseSkillShareAccessUseCase = module.get(
      CheckKnowledgeBaseSkillShareAccessUseCase,
    );
    findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase = module.get(
      FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
    );
    contextService = module.get(ContextService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('countSourcesByKnowledgeBaseIds', () => {
    it('returns the repository counts for every requested knowledge base', async () => {
      const secondKbId = '650e8400-e29b-41d4-a716-446655440001' as UUID;
      const counts = new Map<UUID, number>([
        [kbId, 3],
        [secondKbId, 0],
      ]);
      knowledgeBaseRepository.countSourcesByKnowledgeBaseIds.mockResolvedValue(
        counts,
      );

      const result = await service.countSourcesByKnowledgeBaseIds([
        kbId,
        secondKbId,
      ]);

      expect(result).toEqual(counts);
      expect(
        knowledgeBaseRepository.countSourcesByKnowledgeBaseIds,
      ).toHaveBeenCalledWith([kbId, secondKbId]);
    });
  });

  describe('findAllAccessiblePaginated', () => {
    it('returns only the requested page with shared status', async () => {
      const sharedKbId = '650e8400-e29b-41d4-a716-446655440001' as UUID;
      const sharedKb = makeKb(sharedKbId, otherUserId);
      const page = new Paginated<KnowledgeBase>({
        data: [sharedKb],
        limit: 2,
        offset: 4,
        total: 5,
      });
      knowledgeBaseRepository.findPaginatedAccessible.mockResolvedValue(page);
      findSharesByScopeUseCase.execute.mockResolvedValue([
        { entityId: sharedKbId } as never,
      ]);

      const result = await service.findAllAccessiblePaginated(kbId, {
        search: 'citizen',
        limit: 2,
        offset: 4,
      });

      expect(result.data).toEqual([
        { knowledgeBase: sharedKb, isShared: true, isActive: false },
      ]);
      expect(result.total).toBe(5);
      expect(
        knowledgeBaseRepository.findPaginatedAccessible,
      ).toHaveBeenCalledWith(userId, kbId, [sharedKbId], {
        search: 'citizen',
        limit: 2,
        offset: 4,
      });
    });

    it('includes knowledge bases linked to shared skills', async () => {
      const sharedKbId = '650e8400-e29b-41d4-a716-446655440001' as UUID;
      const sharedKb = makeKb(sharedKbId, otherUserId);
      const page = new Paginated<KnowledgeBase>({
        data: [sharedKb],
        limit: 20,
        offset: 0,
        total: 1,
      });
      knowledgeBaseRepository.findPaginatedAccessible.mockResolvedValue(page);
      findSharesByScopeUseCase.execute.mockResolvedValue([]);
      findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase.execute.mockResolvedValue(
        [sharedKbId],
      );

      const result = await service.findAllAccessiblePaginated(undefined, {
        limit: 20,
        offset: 0,
      });

      expect(result.data).toEqual([
        { knowledgeBase: sharedKb, isShared: true, isActive: false },
      ]);
      expect(
        knowledgeBaseRepository.findPaginatedAccessible,
      ).toHaveBeenCalledWith(userId, undefined, [sharedKbId], {
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('findAccessibleKnowledgeBase', () => {
    it('should return owned KB without checking shares', async () => {
      const kb = makeKb();
      knowledgeBaseRepository.findById.mockResolvedValue(kb);

      const result = await service.findAccessibleKnowledgeBase(kbId);

      expect(result).toBe(kb);
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return shared KB when not owned', async () => {
      const sharedKb = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById
        .mockResolvedValueOnce(sharedKb) // first call: ownership check
        .mockResolvedValueOnce(sharedKb); // second call: fetch after share check
      findShareByEntityUseCase.execute.mockResolvedValue({} as never);

      const result = await service.findAccessibleKnowledgeBase(kbId);

      expect(result).toBe(sharedKb);
    });

    it('should throw KnowledgeBaseNotFoundError when KB is not owned or shared', async () => {
      knowledgeBaseRepository.findById.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      await expect(service.findAccessibleKnowledgeBase(kbId)).rejects.toThrow(
        KnowledgeBaseNotFoundError,
      );
    });

    it('should return KB linked to a skill shared with the user', async () => {
      const kbOfSkillOwner = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById.mockResolvedValue(kbOfSkillOwner);
      findShareByEntityUseCase.execute.mockResolvedValue(null);
      checkKnowledgeBaseSkillShareAccessUseCase.execute.mockResolvedValue(true);

      const result = await service.findAccessibleKnowledgeBase(kbId);

      expect(result).toBe(kbOfSkillOwner);
    });

    it('should throw KnowledgeBaseNotFoundError when no shared skill links the KB', async () => {
      const foreignKb = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById.mockResolvedValue(foreignKb);
      findShareByEntityUseCase.execute.mockResolvedValue(null);
      checkKnowledgeBaseSkillShareAccessUseCase.execute.mockResolvedValue(
        false,
      );

      await expect(service.findAccessibleKnowledgeBase(kbId)).rejects.toThrow(
        KnowledgeBaseNotFoundError,
      );
    });

    it('should throw UnauthorizedAccessError when no user in context', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(service.findAccessibleKnowledgeBase(kbId)).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });
  });

  describe('resolveIsShared', () => {
    it('should return false when user owns the KB', async () => {
      const kb = makeKb();
      knowledgeBaseRepository.findById.mockResolvedValue(kb);

      const result = await service.resolveIsShared(kbId, userId);

      expect(result).toBe(false);
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return true when KB is shared with user', async () => {
      const kb = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById.mockResolvedValue(kb);
      findShareByEntityUseCase.execute.mockResolvedValue({} as never);

      const result = await service.resolveIsShared(kbId, userId);

      expect(result).toBe(true);
    });

    it('should return false when KB is neither owned nor shared', async () => {
      knowledgeBaseRepository.findById.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      const result = await service.resolveIsShared(kbId, userId);

      expect(result).toBe(false);
    });
  });

  describe('findOneAccessible', () => {
    it('should return owned KB with isShared=false', async () => {
      const kb = makeKb();
      knowledgeBaseRepository.findById.mockResolvedValue(kb);

      const result = await service.findOneAccessible(kbId);

      expect(result.knowledgeBase).toBe(kb);
      expect(result.isShared).toBe(false);
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return the current user active status', async () => {
      const kb = makeKb();
      knowledgeBaseRepository.findById.mockResolvedValue(kb);
      knowledgeBaseRepository.isActive.mockResolvedValue(true);

      const result = await service.findOneAccessible(kbId);

      expect(result.isActive).toBe(true);
      expect(knowledgeBaseRepository.isActive).toHaveBeenCalledWith(
        kbId,
        userId,
      );
    });

    it('should return shared KB with isShared=true', async () => {
      const sharedKb = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById.mockResolvedValue(sharedKb);
      findShareByEntityUseCase.execute.mockResolvedValue({} as never);

      const result = await service.findOneAccessible(kbId);

      expect(result.knowledgeBase).toBe(sharedKb);
      expect(result.isShared).toBe(true);
    });

    it('should return a KB shared through a skill with isShared=true', async () => {
      const sharedKb = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById.mockResolvedValue(sharedKb);
      findShareByEntityUseCase.execute.mockResolvedValue(null);
      checkKnowledgeBaseSkillShareAccessUseCase.execute.mockResolvedValue(true);

      const result = await service.findOneAccessible(kbId);

      expect(result).toEqual({
        knowledgeBase: sharedKb,
        isShared: true,
        isActive: false,
      });
    });

    it('should throw KnowledgeBaseNotFoundError when KB does not exist', async () => {
      knowledgeBaseRepository.findById.mockResolvedValue(null);

      await expect(service.findOneAccessible(kbId)).rejects.toThrow(
        KnowledgeBaseNotFoundError,
      );
    });

    it('should throw KnowledgeBaseNotFoundError when KB is not owned and not shared', async () => {
      const otherKb = makeKb(kbId, otherUserId);
      knowledgeBaseRepository.findById.mockResolvedValue(otherKb);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      await expect(service.findOneAccessible(kbId)).rejects.toThrow(
        KnowledgeBaseNotFoundError,
      );
    });

    it('should throw UnauthorizedAccessError when no user in context', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(service.findOneAccessible(kbId)).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });

    it('should only call findById once', async () => {
      const kb = makeKb();
      knowledgeBaseRepository.findById.mockResolvedValue(kb);

      await service.findOneAccessible(kbId);

      expect(knowledgeBaseRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('findActiveAccessible', () => {
    it('delegates active and shared access resolution to one repository query', async () => {
      const activeKnowledgeBase = makeKb();
      knowledgeBaseRepository.findActiveAccessible.mockResolvedValue([
        activeKnowledgeBase,
      ]);

      const result = await service.findActiveAccessible();

      expect(result).toEqual([activeKnowledgeBase]);
      expect(knowledgeBaseRepository.findActiveAccessible).toHaveBeenCalledWith(
        userId,
        orgId,
      );
      expect(findSharesByScopeUseCase.execute).not.toHaveBeenCalled();
      expect(
        findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase.execute,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAllAccessible', () => {
    it('should return owned KBs with isShared=false', async () => {
      const kb = makeKb();
      knowledgeBaseRepository.findAllByUserId.mockResolvedValue([kb]);
      findSharesByScopeUseCase.execute.mockResolvedValue([]);

      const result = await service.findAllAccessible();

      expect(result).toHaveLength(1);
      expect(result[0].knowledgeBase).toBe(kb);
      expect(result[0].isShared).toBe(false);
    });

    it('should return shared KBs with isShared=true', async () => {
      const sharedKbId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
      const sharedKb = makeKb(sharedKbId, otherUserId);
      const share = { entityId: sharedKbId } as Share;

      knowledgeBaseRepository.findAllByUserId.mockResolvedValue([]);
      findSharesByScopeUseCase.execute.mockResolvedValue([share]);
      knowledgeBaseRepository.findByIds.mockResolvedValue([sharedKb]);

      const result = await service.findAllAccessible();

      expect(result).toHaveLength(1);
      expect(result[0].knowledgeBase).toBe(sharedKb);
      expect(result[0].isShared).toBe(true);
    });

    it('should deduplicate owned vs shared KBs', async () => {
      const kb = makeKb();
      const share = { entityId: kbId } as Share;

      knowledgeBaseRepository.findAllByUserId.mockResolvedValue([kb]);
      findSharesByScopeUseCase.execute.mockResolvedValue([share]);

      const result = await service.findAllAccessible();

      expect(result).toHaveLength(1);
      expect(result[0].knowledgeBase).toBe(kb);
      expect(result[0].isShared).toBe(false);
      expect(knowledgeBaseRepository.findByIds).not.toHaveBeenCalled();
    });

    it('should combine owned and shared KBs', async () => {
      const ownedKb = makeKb();
      const sharedKbId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
      const sharedKb = makeKb(sharedKbId, otherUserId);
      const share = { entityId: sharedKbId } as Share;

      knowledgeBaseRepository.findAllByUserId.mockResolvedValue([ownedKb]);
      findSharesByScopeUseCase.execute.mockResolvedValue([share]);
      knowledgeBaseRepository.findByIds.mockResolvedValue([sharedKb]);

      const result = await service.findAllAccessible();

      expect(result).toHaveLength(2);
      expect(result[0].knowledgeBase).toBe(ownedKb);
      expect(result[0].isShared).toBe(false);
      expect(result[1].knowledgeBase).toBe(sharedKb);
      expect(result[1].isShared).toBe(true);
    });

    it('should return KBs linked to shared skills with isShared=true', async () => {
      const sharedKbId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
      const sharedKb = makeKb(sharedKbId, otherUserId);

      knowledgeBaseRepository.findAllByUserId.mockResolvedValue([]);
      findSharesByScopeUseCase.execute.mockResolvedValue([]);
      findKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase.execute.mockResolvedValue(
        [sharedKbId],
      );
      knowledgeBaseRepository.findByIds.mockResolvedValue([sharedKb]);

      const result = await service.findAllAccessible();

      expect(result).toEqual([
        { knowledgeBase: sharedKb, isShared: true, isActive: false },
      ]);
      expect(knowledgeBaseRepository.findByIds).toHaveBeenCalledWith([
        sharedKbId,
      ]);
    });

    it('should throw UnauthorizedAccessError when no user in context', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(service.findAllAccessible()).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });
  });
});
