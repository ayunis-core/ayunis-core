import { CreateSkillWithUniqueNameUseCase } from './create-skill-with-unique-name.use-case';
import { CreateSkillWithUniqueNameCommand } from './create-skill-with-unique-name.command';
import type { SkillRepository } from '../../ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { SkillNameResolutionError } from '../../skills.errors';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';

describe('CreateSkillWithUniqueNameUseCase', () => {
  let useCase: CreateSkillWithUniqueNameUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;

  const userId = randomUUID();

  beforeEach(() => {
    skillRepository = {
      create: jest
        .fn()
        .mockImplementation((skill: Skill) => Promise.resolve(skill)),
      activateSkill: jest.fn().mockResolvedValue(undefined),
      pinSkill: jest.fn().mockResolvedValue(undefined),
      findByNameAndOwner: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<SkillRepository>;

    useCase = new CreateSkillWithUniqueNameUseCase(skillRepository);
  });

  it('should create and activate a skill with the given name when no collision exists', async () => {
    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Summarizer',
      shortDescription: 'Summarizes documents',
      instructions: 'You are a summarizer assistant',
      userId,
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Summarizer');
    expect(result.shortDescription).toBe('Summarizes documents');
    expect(result.instructions).toBe('You are a summarizer assistant');
    expect(result.userId).toBe(userId);
    expect(skillRepository.create).toHaveBeenCalledTimes(1);
    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      result.id,
      userId,
    );
  });

  it('should append a numeric suffix when the name already exists', async () => {
    skillRepository.findByNameAndOwner.mockImplementation(
      (name: string, ownerId: UUID) =>
        Promise.resolve(
          name === 'Summarizer'
            ? new Skill({
                name: 'Summarizer',
                shortDescription: 'existing',
                instructions: 'existing',
                userId: ownerId,
              })
            : null,
        ),
    );

    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Summarizer',
      shortDescription: 'Summarizes documents',
      instructions: 'You are a summarizer assistant',
      userId,
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Summarizer 2');
  });

  it('should increment suffix until a unique name is found', async () => {
    const existingNames = new Set([
      'Translator',
      'Translator 2',
      'Translator 3',
    ]);
    skillRepository.findByNameAndOwner.mockImplementation((name: string) =>
      Promise.resolve(
        existingNames.has(name)
          ? new Skill({
              name,
              shortDescription: 'existing',
              instructions: 'existing',
              userId,
            })
          : null,
      ),
    );

    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Translator',
      shortDescription: 'Translates text',
      instructions: 'You are a translator',
      userId,
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Translator 4');
  });

  it('should not activate the skill when isActive is false', async () => {
    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Inactive Skill',
      shortDescription: 'Not active',
      instructions: 'Instructions',
      userId,
      isActive: false,
    });

    await useCase.execute(command);

    expect(skillRepository.create).toHaveBeenCalledTimes(1);
    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
  });

  it('should call pinSkill when isPinned is true', async () => {
    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Pinned Skill',
      shortDescription: 'Pinned',
      instructions: 'Instructions',
      userId,
      isPinned: true,
    });

    const result = await useCase.execute(command);

    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      result.id,
      userId,
    );
    expect(skillRepository.pinSkill).toHaveBeenCalledWith(result.id, userId);
  });

  it('should not call pinSkill by default', async () => {
    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Default Skill',
      shortDescription: 'Default',
      instructions: 'Instructions',
      userId,
    });

    await useCase.execute(command);

    expect(skillRepository.activateSkill).toHaveBeenCalled();
    expect(skillRepository.pinSkill).not.toHaveBeenCalled();
  });

  it('should throw when unique name cannot be resolved after max attempts', async () => {
    skillRepository.findByNameAndOwner.mockResolvedValue(
      new Skill({
        name: 'Collider',
        shortDescription: 'existing',
        instructions: 'existing',
        userId,
      }),
    );

    const command = new CreateSkillWithUniqueNameCommand({
      name: 'Collider',
      shortDescription: 'Always collides',
      instructions: 'This will fail',
      userId,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillNameResolutionError,
    );
  });
});
