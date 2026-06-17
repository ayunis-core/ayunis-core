import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreateSkillTemplateUseCase } from './create-skill-template.use-case';
import { CreateSkillTemplateCommand } from './create-skill-template.command';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
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

  it('should create a skill template successfully', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Legal Guidelines',
      shortDescription: 'Legal compliance instructions',
      instructions: 'Always follow legal guidelines when responding.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    const expectedTemplate = new AlwaysOnSkillTemplate({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
    });

    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(expectedTemplate);

    const result = await useCase.execute(command);

    expect(repository.findByName).toHaveBeenCalledWith('Legal Guidelines');
    expect(repository.create).toHaveBeenCalledWith(expect.any(SkillTemplate));
    expect(result.name).toBe('Legal Guidelines');
    expect(result.distributionMode).toBe(DistributionMode.ALWAYS_ON);
  });

  it('should create a skill template with isActive flag', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Active Template',
      shortDescription: 'An active template',
      instructions: 'Instructions here.',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
      isActive: true,
    });

    const expectedTemplate = new PreCreatedCopySkillTemplate({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      isActive: true,
    });

    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(expectedTemplate);

    const result = await useCase.execute(command);

    expect(result.isActive).toBe(true);
    expect(result.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
  });

  it('should pass defaultActive and defaultPinned to pre-created copy templates', async () => {
    const command = new CreateSkillTemplateCommand({
      name: 'Preconfigured Template',
      shortDescription: 'A preconfigured template',
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
    const preCreated = result as PreCreatedCopySkillTemplate;
    expect(preCreated.defaultActive).toBe(true);
    expect(preCreated.defaultPinned).toBe(true);
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
