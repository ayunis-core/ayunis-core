import { FindSkillByNameUseCase } from './find-skill-by-name.use-case';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import { SkillRepository } from '../../ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotFoundError } from '../../skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('FindSkillByNameUseCase', () => {
  let useCase: FindSkillByNameUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let contextService: jest.Mocked<ContextService>;

  const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;

  beforeEach(() => {
    skillRepository = {
      findByNameAndOwner: jest.fn(),
    } as unknown as jest.Mocked<SkillRepository>;

    contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as jest.Mocked<ContextService>;

    useCase = new FindSkillByNameUseCase(skillRepository, contextService);
  });

  it('should return the skill when found by name', async () => {
    const skill = new Skill({
      name: 'ayunis-core-backend-dev',
      shortDescription: 'Backend development skill',
      instructions: 'Detailed instructions for backend development',
      userId,
    });
    skillRepository.findByNameAndOwner.mockResolvedValue(skill);

    const result = await useCase.execute(
      new FindSkillByNameQuery('ayunis-core-backend-dev'),
    );

    expect(result).toBe(skill);
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'ayunis-core-backend-dev',
      userId,
    );
  });

  it('should throw SkillNotFoundError when skill does not exist', async () => {
    skillRepository.findByNameAndOwner.mockResolvedValue(null);

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
