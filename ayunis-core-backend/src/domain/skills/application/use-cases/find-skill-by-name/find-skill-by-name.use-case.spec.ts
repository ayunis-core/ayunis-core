import { FindSkillByNameUseCase } from './find-skill-by-name.use-case';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import type { SkillRepository } from '../../ports/skill.repository';
import type { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { Skill } from '../../../domain/skill.entity';
import { SkillShare } from 'src/domain/shares/domain/share.entity';
import { OrgShareScope } from 'src/domain/shares/domain/share-scope.entity';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { SkillNotFoundError } from '../../skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('FindSkillByNameUseCase', () => {
  let useCase: FindSkillByNameUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let findSharesByScopeUseCase: jest.Mocked<FindSharesByScopeUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
  const orgId = 'org-00000-0000-0000-000000000001' as UUID;

  const makeSkill = (name: string, owner: UUID = userId) =>
    new Skill({
      name,
      shortDescription: 'desc',
      instructions: 'instructions',
      userId: owner,
    });

  const makeSkillShare = (skillId: UUID) =>
    new SkillShare({
      skillId,
      scope: new OrgShareScope({ orgId }),
      ownerId: 'other-user' as UUID,
    });

  beforeEach(() => {
    skillRepository = {
      findByNameAndOwner: jest.fn(),
      findByIds: jest.fn(),
      toggleSkillPinned: jest.fn(),
      isSkillPinned: jest.fn(),
      getPinnedSkillIds: jest.fn(),
    } as unknown as jest.Mocked<SkillRepository>;

    findSharesByScopeUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindSharesByScopeUseCase>;

    contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as jest.Mocked<ContextService>;

    useCase = new FindSkillByNameUseCase(
      skillRepository,
      findSharesByScopeUseCase,
      contextService,
    );
  });

  it('should return the owned skill when found by name', async () => {
    const skill = makeSkill('ayunis-core-backend-dev');
    skillRepository.findByNameAndOwner.mockResolvedValue(skill);

    const result = await useCase.execute(
      new FindSkillByNameQuery('ayunis-core-backend-dev'),
    );

    expect(result).toBe(skill);
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'ayunis-core-backend-dev',
      userId,
    );
    expect(findSharesByScopeUseCase.execute).not.toHaveBeenCalled();
  });

  it('should find owned skill first on name collision with shared skill', async () => {
    const ownedSkill = makeSkill('my-skill');
    skillRepository.findByNameAndOwner.mockResolvedValue(ownedSkill);

    const result = await useCase.execute(new FindSkillByNameQuery('my-skill'));

    expect(result).toBe(ownedSkill);
    expect(findSharesByScopeUseCase.execute).not.toHaveBeenCalled();
  });

  it('should find shared skill when no owned match', async () => {
    const sharedSkill = makeSkill('shared-skill', 'other-user' as UUID);
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    findSharesByScopeUseCase.execute.mockResolvedValue([
      makeSkillShare(sharedSkill.id),
    ]);
    skillRepository.findByIds.mockResolvedValue([sharedSkill]);

    const result = await useCase.execute(
      new FindSkillByNameQuery('shared-skill'),
    );

    expect(result).toBe(sharedSkill);
  });

  it('should throw SkillNotFoundError when neither owned nor shared exists', async () => {
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    findSharesByScopeUseCase.execute.mockResolvedValue([]);

    await expect(
      useCase.execute(new FindSkillByNameQuery('nonexistent-skill')),
    ).rejects.toThrow(SkillNotFoundError);
  });

  it('should throw UnauthorizedAccessError when user is not authenticated', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindSkillByNameQuery('some-skill')),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
