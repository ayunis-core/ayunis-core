import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { SkillCreatorNameService } from './skill-creator-name.service';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe('SkillCreatorNameService', () => {
  let service: SkillCreatorNameService;
  let mockFindUsersByIdsUseCase: Partial<FindUsersByIdsUseCase>;

  const ORG_ID = 'org-id' as UUID;
  const alice = new User({
    id: 'user-1' as UUID,
    name: 'Alice',
    email: 'alice@example.com',
    emailVerified: true,
    passwordHash: 'hash',
    role: UserRole.USER,
    orgId: ORG_ID,
    hasAcceptedMarketing: false,
  });
  const bob = new User({
    id: 'user-2' as UUID,
    name: 'Bob',
    email: 'bob@example.com',
    emailVerified: true,
    passwordHash: 'hash',
    role: UserRole.USER,
    orgId: ORG_ID,
    hasAcceptedMarketing: false,
  });

  beforeAll(async () => {
    mockFindUsersByIdsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillCreatorNameService,
        {
          provide: FindUsersByIdsUseCase,
          useValue: mockFindUsersByIdsUseCase,
        },
      ],
    }).compile();

    service = module.get<SkillCreatorNameService>(SkillCreatorNameService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveMany', () => {
    it('returns a map keyed by userId with display names', async () => {
      (mockFindUsersByIdsUseCase.execute as jest.Mock).mockResolvedValue([
        alice,
        bob,
      ]);

      const result = await service.resolveMany([alice.id, bob.id]);

      expect(result.get(alice.id)).toBe('Alice');
      expect(result.get(bob.id)).toBe('Bob');
      expect(result.size).toBe(2);
    });

    it('omits users that the underlying use case did not return', async () => {
      (mockFindUsersByIdsUseCase.execute as jest.Mock).mockResolvedValue([
        alice,
      ]);

      const result = await service.resolveMany([alice.id, bob.id]);

      expect(result.has(bob.id)).toBe(false);
    });

    it('deduplicates input ids before querying', async () => {
      (mockFindUsersByIdsUseCase.execute as jest.Mock).mockResolvedValue([
        alice,
      ]);

      await service.resolveMany([alice.id, alice.id]);

      const calledWith = (mockFindUsersByIdsUseCase.execute as jest.Mock).mock
        .calls[0][0];
      expect(calledWith.ids).toEqual([alice.id]);
    });

    it('short-circuits on empty input without calling the use case', async () => {
      const result = await service.resolveMany([]);

      expect(result.size).toBe(0);
      expect(mockFindUsersByIdsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('resolveOne', () => {
    it('delegates to resolveMany and returns the name', async () => {
      (mockFindUsersByIdsUseCase.execute as jest.Mock).mockResolvedValue([
        alice,
      ]);

      const result = await service.resolveOne(alice.id);

      expect(result).toBe('Alice');
      expect(mockFindUsersByIdsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [alice.id] }),
      );
    });

    it('returns null when the user is not found (e.g. cross-org or deleted)', async () => {
      (mockFindUsersByIdsUseCase.execute as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveOne(alice.id);

      expect(result).toBeNull();
    });
  });
});
