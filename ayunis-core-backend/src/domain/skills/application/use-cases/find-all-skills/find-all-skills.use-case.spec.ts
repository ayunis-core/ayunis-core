import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { FindAllSkillsUseCase } from './find-all-skills.use-case';
import { FindAllSkillsQuery } from './find-all-skills.query';
import { SkillRepository } from '../../ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { SkillShare } from 'src/domain/shares/domain/share.entity';
import { OrgShareScope } from 'src/domain/shares/domain/share-scope.entity';
import type { UUID } from 'crypto';

describe('FindAllSkillsUseCase', () => {
  let useCase: FindAllSkillsUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let findSharesByScopeUseCase: jest.Mocked<FindSharesByScopeUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = 'org-00000-0000-0000-000000000001' as UUID;

  const makeSkill = (id: string, userId: UUID = mockUserId): Skill =>
    new Skill({
      id: id as UUID,
      name: `Skill ${id}`,
      shortDescription: 'desc',
      instructions: 'instructions',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const makeSkillShare = (skillId: string): SkillShare =>
    new SkillShare({
      id: `share-${skillId}` as UUID,
      skillId: skillId as UUID,
      scope: new OrgShareScope({ orgId: mockOrgId }),
      ownerId: 'other-user-id' as UUID,
      createdAt: new Date(),
    });

  beforeAll(async () => {
    const mockSkillRepository = {
      findAllByOwner: jest.fn(),
      findByIds: jest.fn(),
      toggleSkillPinned: jest.fn(),
      getPinnedSkillIds: jest.fn(),
    };

    const mockFindSharesByScopeUseCase = {
      execute: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllSkillsUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        {
          provide: FindSharesByScopeUseCase,
          useValue: mockFindSharesByScopeUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<FindAllSkillsUseCase>(FindAllSkillsUseCase);
    skillRepository = module.get(SkillRepository);
    findSharesByScopeUseCase = module.get(FindSharesByScopeUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return owned skills with isShared=false', async () => {
    const ownedSkill = makeSkill('skill-1');
    skillRepository.findAllByOwner.mockResolvedValue([ownedSkill]);
    findSharesByScopeUseCase.execute.mockResolvedValue([]);

    const results = await useCase.execute(new FindAllSkillsQuery());

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe(ownedSkill);
    expect(results[0].isShared).toBe(false);
  });

  it('should return shared skills with isShared=true', async () => {
    const sharedSkillId = 'skill-shared-1';
    const sharedSkill = makeSkill(sharedSkillId, 'other-user-id' as UUID);

    skillRepository.findAllByOwner.mockResolvedValue([]);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      makeSkillShare(sharedSkillId),
    ]);
    skillRepository.findByIds.mockResolvedValue([sharedSkill]);

    const results = await useCase.execute(new FindAllSkillsQuery());

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe(sharedSkill);
    expect(results[0].isShared).toBe(true);
  });

  it('should deduplicate owned vs shared (owned wins)', async () => {
    const skillId = 'skill-1';
    const ownedSkill = makeSkill(skillId);

    skillRepository.findAllByOwner.mockResolvedValue([ownedSkill]);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      makeSkillShare(skillId),
    ]);

    const results = await useCase.execute(new FindAllSkillsQuery());

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe(ownedSkill);
    expect(results[0].isShared).toBe(false);
    expect(skillRepository.findByIds).not.toHaveBeenCalled();
  });

  it('should combine owned and shared skills', async () => {
    const ownedSkill = makeSkill('skill-owned');
    const sharedSkillId = 'skill-shared';
    const sharedSkill = makeSkill(sharedSkillId, 'other-user' as UUID);

    skillRepository.findAllByOwner.mockResolvedValue([ownedSkill]);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      makeSkillShare(sharedSkillId),
    ]);
    skillRepository.findByIds.mockResolvedValue([sharedSkill]);

    const results = await useCase.execute(new FindAllSkillsQuery());

    expect(results).toHaveLength(2);
    expect(results[0].skill).toBe(ownedSkill);
    expect(results[0].isShared).toBe(false);
    expect(results[1].skill).toBe(sharedSkill);
    expect(results[1].isShared).toBe(true);
  });

  it('should not fetch shared skills when there are no shares', async () => {
    skillRepository.findAllByOwner.mockResolvedValue([]);
    findSharesByScopeUseCase.execute.mockResolvedValue([]);

    const results = await useCase.execute(new FindAllSkillsQuery());

    expect(results).toHaveLength(0);
    expect(skillRepository.findByIds).not.toHaveBeenCalled();
  });
});
