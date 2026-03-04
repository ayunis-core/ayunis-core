import { FindActivePreCreatedTemplatesUseCase } from './find-active-pre-created-templates.use-case';
import { FindActivePreCreatedTemplatesQuery } from './find-active-pre-created-templates.query';
import type { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { randomUUID } from 'crypto';

describe('FindActivePreCreatedTemplatesUseCase', () => {
  let useCase: FindActivePreCreatedTemplatesUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  const mockTemplates: SkillTemplate[] = [
    new SkillTemplate({
      id: randomUUID(),
      name: 'Starter Skill',
      shortDescription: 'A pre-created starter skill',
      instructions: 'Follow these starter instructions...',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
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

    useCase = new FindActivePreCreatedTemplatesUseCase(repository);
  });

  it('should return active pre-created templates from repository', async () => {
    const result = await useCase.execute(
      new FindActivePreCreatedTemplatesQuery(),
    );

    expect(result).toEqual(mockTemplates);
    expect(repository.findActiveByMode).toHaveBeenCalledWith(
      DistributionMode.PRE_CREATED_COPY,
    );
  });

  it('should return empty array when no templates exist', async () => {
    repository.findActiveByMode.mockResolvedValue([]);

    const result = await useCase.execute(
      new FindActivePreCreatedTemplatesQuery(),
    );

    expect(result).toEqual([]);
    expect(repository.findActiveByMode).toHaveBeenCalledWith(
      DistributionMode.PRE_CREATED_COPY,
    );
  });

  it('should throw UnexpectedSkillTemplateError on repository failure', async () => {
    repository.findActiveByMode.mockRejectedValue(new Error('DB error'));

    await expect(
      useCase.execute(new FindActivePreCreatedTemplatesQuery()),
    ).rejects.toThrow('Unexpected error occurred');
  });
});
