import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindOneSkillTemplateUseCase } from './find-one-skill-template.use-case';
import { FindOneSkillTemplateQuery } from './find-one-skill-template.query';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { SkillTemplateNotFoundError } from '../../skill-templates.errors';

describe('FindOneSkillTemplateUseCase', () => {
  let useCase: FindOneSkillTemplateUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  const mockId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeAll(async () => {
    const mockRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOneSkillTemplateUseCase,
        { provide: SkillTemplateRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<FindOneSkillTemplateUseCase>(
      FindOneSkillTemplateUseCase,
    );
    repository = module.get(SkillTemplateRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a skill template by ID', async () => {
    const template = new SkillTemplate({
      id: mockId,
      name: 'Legal Guidelines',
      shortDescription: 'Description',
      instructions: 'Instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    repository.findOne.mockResolvedValue(template);

    const result = await useCase.execute(new FindOneSkillTemplateQuery(mockId));

    expect(repository.findOne).toHaveBeenCalledWith(mockId);
    expect(result.name).toBe('Legal Guidelines');
  });

  it('should throw not found when template does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindOneSkillTemplateQuery(mockId)),
    ).rejects.toThrow(SkillTemplateNotFoundError);
  });
});
