import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { CheckKnowledgeBaseSkillShareAccessUseCase } from './check-knowledge-base-skill-share-access.use-case';
import { CheckKnowledgeBaseSkillShareAccessQuery } from './check-knowledge-base-skill-share-access.query';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import type { Share } from 'src/domain/shares/domain/share.entity';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { UUID } from 'crypto';

describe('CheckKnowledgeBaseSkillShareAccessUseCase', () => {
  let useCase: CheckKnowledgeBaseSkillShareAccessUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let findSharesByScopeUseCase: jest.Mocked<FindSharesByScopeUseCase>;

  const knowledgeBaseId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const knowledgeBaseOwnerId = '440e8400-e29b-41d4-a716-446655440009' as UUID;
  const sharedSkillId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
  const unsharedSkillId = '770e8400-e29b-41d4-a716-446655440002' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckKnowledgeBaseSkillShareAccessUseCase,
        {
          provide: SkillRepository,
          useValue: { findSkillsByKnowledgeBaseAndOwners: jest.fn() },
        },
        {
          provide: FindSharesByScopeUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CheckKnowledgeBaseSkillShareAccessUseCase);
    skillRepository = module.get(SkillRepository);
    findSharesByScopeUseCase = module.get(FindSharesByScopeUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  const executeQuery = () =>
    useCase.execute(
      new CheckKnowledgeBaseSkillShareAccessQuery(
        knowledgeBaseId,
        knowledgeBaseOwnerId,
      ),
    );

  it('should return true when the KB owner linked it to a skill of theirs that is shared with the user', async () => {
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      { id: unsharedSkillId } as Skill,
      { id: sharedSkillId } as Skill,
    ]);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      { entityId: sharedSkillId } as Share,
    ]);

    await expect(executeQuery()).resolves.toBe(true);
  });

  it('should only consider skills owned by the KB owner, so foreign skills grant nothing', async () => {
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([]);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      { entityId: sharedSkillId } as Share,
    ]);

    await expect(executeQuery()).resolves.toBe(false);
    expect(
      skillRepository.findSkillsByKnowledgeBaseAndOwners,
    ).toHaveBeenCalledWith(knowledgeBaseId, [knowledgeBaseOwnerId]);
    expect(findSharesByScopeUseCase.execute).not.toHaveBeenCalled();
  });

  it("should return false when the KB owner's linked skills are not shared with the user", async () => {
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      { id: unsharedSkillId } as Skill,
    ]);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      { entityId: sharedSkillId } as Share,
    ]);

    await expect(executeQuery()).resolves.toBe(false);
  });
});
