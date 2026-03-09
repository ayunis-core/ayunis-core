import { FindActiveAlwaysOnTemplatesUseCase } from './find-active-always-on-templates.use-case';
import { FindActiveAlwaysOnTemplatesQuery } from './find-active-always-on-templates.query';
import type { SkillTemplateRepository } from '../../ports/skill-template.repository';
import type { SkillTemplate } from '../../../domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { randomUUID } from 'crypto';

describe('FindActiveAlwaysOnTemplatesUseCase', () => {
  let useCase: FindActiveAlwaysOnTemplatesUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  const mockTemplates: SkillTemplate[] = [
    new AlwaysOnSkillTemplate({
      id: randomUUID(),
      name: 'Global Policy',
      shortDescription: 'Global policy instructions',
      instructions: 'Always follow these rules...',
      isActive: true,
    }),
  ];

  beforeEach(() => {
    repository = {
      findActiveByMode: jest.fn().mockResolvedValue(mockTemplates),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
    } as unknown as jest.Mocked<SkillTemplateRepository>;

    useCase = new FindActiveAlwaysOnTemplatesUseCase(repository);
  });

  it('should return active always-on templates from repository', async () => {
    const result = await useCase.execute(
      new FindActiveAlwaysOnTemplatesQuery(),
    );

    expect(result).toEqual(mockTemplates);
    expect(repository.findActiveByMode).toHaveBeenCalledWith(
      DistributionMode.ALWAYS_ON,
    );
  });

  it('should cache results and not call repository on subsequent calls', async () => {
    await useCase.execute(new FindActiveAlwaysOnTemplatesQuery());
    await useCase.execute(new FindActiveAlwaysOnTemplatesQuery());

    expect(repository.findActiveByMode).toHaveBeenCalledTimes(1);
  });

  it('should refresh cache after clearCache is called', async () => {
    await useCase.execute(new FindActiveAlwaysOnTemplatesQuery());
    useCase.clearCache();
    await useCase.execute(new FindActiveAlwaysOnTemplatesQuery());

    expect(repository.findActiveByMode).toHaveBeenCalledTimes(2);
  });

  it('should throw UnexpectedSkillTemplateError on repository failure', async () => {
    repository.findActiveByMode.mockRejectedValue(new Error('DB error'));

    await expect(
      useCase.execute(new FindActiveAlwaysOnTemplatesQuery()),
    ).rejects.toThrow('Unexpected error occurred');
  });
});
