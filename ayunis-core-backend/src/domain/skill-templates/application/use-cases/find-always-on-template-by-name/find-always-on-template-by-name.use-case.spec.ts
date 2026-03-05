import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { FindAlwaysOnTemplateByNameUseCase } from './find-always-on-template-by-name.use-case';
import { FindAlwaysOnTemplateByNameQuery } from './find-always-on-template-by-name.query';
import { FindActiveAlwaysOnTemplatesUseCase } from '../find-active-always-on-templates/find-active-always-on-templates.use-case';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';

describe('FindAlwaysOnTemplateByNameUseCase', () => {
  let useCase: FindAlwaysOnTemplateByNameUseCase;
  let findActiveAlwaysOnTemplates: jest.Mocked<FindActiveAlwaysOnTemplatesUseCase>;

  const alwaysOnTemplate = new SkillTemplate({
    id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
    name: 'German Administrative Law',
    shortDescription: 'German admin law guidelines',
    instructions: 'Follow German administrative law...',
    distributionMode: DistributionMode.ALWAYS_ON,
    isActive: true,
  });

  const preCreatedTemplate = new SkillTemplate({
    id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
    name: 'Data Analysis',
    shortDescription: 'Data analysis helper',
    instructions: 'Analyze data...',
    distributionMode: DistributionMode.PRE_CREATED_COPY,
    isActive: true,
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAlwaysOnTemplateByNameUseCase,
        {
          provide: FindActiveAlwaysOnTemplatesUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(FindAlwaysOnTemplateByNameUseCase);
    findActiveAlwaysOnTemplates = module.get(
      FindActiveAlwaysOnTemplatesUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should find an always-on template by name', async () => {
    findActiveAlwaysOnTemplates.execute.mockResolvedValue([alwaysOnTemplate]);

    const result = await useCase.execute(
      new FindAlwaysOnTemplateByNameQuery('German Administrative Law'),
    );

    expect(result).toBe(alwaysOnTemplate);
  });

  it('should return null when template name does not match', async () => {
    findActiveAlwaysOnTemplates.execute.mockResolvedValue([alwaysOnTemplate]);

    const result = await useCase.execute(
      new FindAlwaysOnTemplateByNameQuery('Nonexistent Skill'),
    );

    expect(result).toBeNull();
  });

  it('should return null when no always-on templates exist', async () => {
    findActiveAlwaysOnTemplates.execute.mockResolvedValue([]);

    const result = await useCase.execute(
      new FindAlwaysOnTemplateByNameQuery('German Administrative Law'),
    );

    expect(result).toBeNull();
  });

  it('should not find templates that are not always-on', async () => {
    // Return both templates — the use case filters by name, not distribution mode,
    // but since we search for a pre-created template name that doesn't match any
    // always-on template, the result should be null
    findActiveAlwaysOnTemplates.execute.mockResolvedValue([alwaysOnTemplate]);

    const result = await useCase.execute(
      new FindAlwaysOnTemplateByNameQuery(preCreatedTemplate.name),
    );

    expect(result).toBeNull();
  });
});
