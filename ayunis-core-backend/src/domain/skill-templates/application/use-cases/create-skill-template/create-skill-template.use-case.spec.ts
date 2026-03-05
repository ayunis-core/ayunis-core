import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreateSkillTemplateUseCase } from './create-skill-template.use-case';
import { CreateSkillTemplateCommand } from './create-skill-template.command';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { InvalidSkillTemplateNameError } from '../../../domain/skill-template.entity';
import { DuplicateSkillTemplateNameError } from '../../skill-templates.errors';

describe('CreateSkillTemplateUseCase', () => {
  let useCase: CreateSkillTemplateUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  beforeAll(async () => {
    const mockRepository = {
      create: jest.fn(),
      findByName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSkillTemplateUseCase,
        { provide: SkillTemplateRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<CreateSkillTemplateUseCase>(
      CreateSkillTemplateUseCase,
    );
    repository = module.get(SkillTemplateRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an AlwaysOnSkillTemplate for ALWAYS_ON mode', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Legal Guidelines',
      shortDescription: 'Legal compliance instructions',
      instructions: 'Always follow legal guidelines when responding.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    repository.findByName.mockResolvedValue(null);
    repository.create.mockImplementation(async (t) => t);

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(AlwaysOnSkillTemplate);
    expect(repository.create).toHaveBeenCalledWith(
      expect.any(AlwaysOnSkillTemplate),
    );
    expect(result.name).toBe('Legal Guidelines');
    expect(result.distributionMode).toBe(DistributionMode.ALWAYS_ON);
  });

  it('should create a PreCreatedCopySkillTemplate for PRE_CREATED_COPY mode', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Starter Skill',
      shortDescription: 'A starter skill',
      instructions: 'Instructions here.',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
      isActive: true,
      defaultActive: true,
      defaultPinned: true,
    });

    repository.findByName.mockResolvedValue(null);
    repository.create.mockImplementation(async (t) => t);

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(PreCreatedCopySkillTemplate);
    expect(result.isActive).toBe(true);
    expect(result.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
    expect((result as PreCreatedCopySkillTemplate).defaultActive).toBe(true);
    expect((result as PreCreatedCopySkillTemplate).defaultPinned).toBe(true);
  });

  it('should default defaultActive and defaultPinned to false for PRE_CREATED_COPY', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Minimal Copy',
      shortDescription: 'Minimal',
      instructions: 'Instructions.',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
    });

    repository.findByName.mockResolvedValue(null);
    repository.create.mockImplementation(async (t) => t);

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(PreCreatedCopySkillTemplate);
    expect((result as PreCreatedCopySkillTemplate).defaultActive).toBe(false);
    expect((result as PreCreatedCopySkillTemplate).defaultPinned).toBe(false);
  });

  it('should reject creation when name already exists', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Legal Guidelines',
      shortDescription: 'Duplicate name',
      instructions: 'Some instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    const existingTemplate = new AlwaysOnSkillTemplate({
      name: 'Legal Guidelines',
      shortDescription: 'Existing template',
      instructions: 'Existing instructions.',
    });

    repository.findByName.mockResolvedValue(existingTemplate);

    await expect(useCase.execute(command)).rejects.toThrow(
      DuplicateSkillTemplateNameError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should rethrow InvalidSkillTemplateNameError for invalid names', async () => {
    const command = new CreateSkillTemplateCommand({
      name: '  invalid  name  ',
      shortDescription: 'Description',
      instructions: 'Instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    repository.findByName.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidSkillTemplateNameError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
