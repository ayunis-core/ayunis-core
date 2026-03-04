import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { FindAllSkillTemplatesUseCase } from './find-all-skill-templates.use-case';
import { FindAllSkillTemplatesQuery } from './find-all-skill-templates.query';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';

describe('FindAllSkillTemplatesUseCase', () => {
  let useCase: FindAllSkillTemplatesUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  beforeAll(async () => {
    const mockRepository = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllSkillTemplatesUseCase,
        { provide: SkillTemplateRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<FindAllSkillTemplatesUseCase>(
      FindAllSkillTemplatesUseCase,
    );
    repository = module.get(SkillTemplateRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all skill templates', async () => {
    const templates = [
      new SkillTemplate({
        name: 'Template 1',
        shortDescription: 'First',
        instructions: 'Instructions 1.',
        distributionMode: DistributionMode.ALWAYS_ON,
      }),
      new SkillTemplate({
        name: 'Template 2',
        shortDescription: 'Second',
        instructions: 'Instructions 2.',
        distributionMode: DistributionMode.PRE_CREATED_COPY,
        isActive: true,
      }),
    ];

    repository.findAll.mockResolvedValue(templates);

    const result = await useCase.execute(new FindAllSkillTemplatesQuery());

    expect(repository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Template 1');
    expect(result[1].name).toBe('Template 2');
  });

  it('should return empty array when no templates exist', async () => {
    repository.findAll.mockResolvedValue([]);

    const result = await useCase.execute(new FindAllSkillTemplatesQuery());

    expect(result).toHaveLength(0);
  });
});
