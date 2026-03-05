import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { UpdateSkillTemplateUseCase } from './update-skill-template.use-case';
import { UpdateSkillTemplateCommand } from './update-skill-template.command';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { InvalidSkillTemplateNameError } from '../../../domain/skill-template.entity';
import {
  DuplicateSkillTemplateNameError,
  SkillTemplateNotFoundError,
} from '../../skill-templates.errors';

describe('UpdateSkillTemplateUseCase', () => {
  let useCase: UpdateSkillTemplateUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  const mockId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeAll(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSkillTemplateUseCase,
        { provide: SkillTemplateRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<UpdateSkillTemplateUseCase>(
      UpdateSkillTemplateUseCase,
    );
    repository = module.get(SkillTemplateRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update a skill template with all fields provided', async () => {
    const existing = new SkillTemplate({
      id: mockId,
      name: 'Legal Guidelines',
      shortDescription: 'Original description',
      instructions: 'Original instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    const command = new UpdateSkillTemplateCommand({
      skillTemplateId: mockId,
      name: 'Legal Guidelines',
      shortDescription: 'Updated description',
      instructions: 'Updated instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
      isActive: true,
    });

    repository.findOne.mockResolvedValue(existing);
    repository.update.mockImplementation(async (t) => t);

    const result = await useCase.execute(command);

    expect(repository.findOne).toHaveBeenCalledWith(mockId);
    expect(repository.findByName).not.toHaveBeenCalled();
    expect(result.shortDescription).toBe('Updated description');
    expect(result.isActive).toBe(true);
  });

  it('should merge with existing values when only partial fields provided', async () => {
    const existing = new SkillTemplate({
      id: mockId,
      name: 'Legal Guidelines',
      shortDescription: 'Original description',
      instructions: 'Original instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
      isActive: false,
    });

    const command = new UpdateSkillTemplateCommand({
      skillTemplateId: mockId,
      shortDescription: 'Updated description',
    });

    repository.findOne.mockResolvedValue(existing);
    repository.update.mockImplementation(async (t) => t);

    const result = await useCase.execute(command);

    expect(result.name).toBe('Legal Guidelines');
    expect(result.shortDescription).toBe('Updated description');
    expect(result.instructions).toBe('Original instructions.');
    expect(result.distributionMode).toBe(DistributionMode.ALWAYS_ON);
    expect(result.isActive).toBe(false);
  });

  it('should check name uniqueness when name changes', async () => {
    const existing = new SkillTemplate({
      id: mockId,
      name: 'Old Name',
      shortDescription: 'Description',
      instructions: 'Instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    const command = new UpdateSkillTemplateCommand({
      skillTemplateId: mockId,
      name: 'New Name',
    });

    repository.findOne.mockResolvedValue(existing);
    repository.findByName.mockResolvedValue(null);
    repository.update.mockImplementation(async (t) => t);

    const result = await useCase.execute(command);

    expect(repository.findByName).toHaveBeenCalledWith('New Name');
    expect(result.name).toBe('New Name');
  });

  it('should reject update when new name already exists', async () => {
    const existing = new SkillTemplate({
      id: mockId,
      name: 'Old Name',
      shortDescription: 'Description',
      instructions: 'Instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    const duplicate = new SkillTemplate({
      name: 'Taken Name',
      shortDescription: 'Other',
      instructions: 'Other.',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
    });

    const command = new UpdateSkillTemplateCommand({
      skillTemplateId: mockId,
      name: 'Taken Name',
    });

    repository.findOne.mockResolvedValue(existing);
    repository.findByName.mockResolvedValue(duplicate);

    await expect(useCase.execute(command)).rejects.toThrow(
      DuplicateSkillTemplateNameError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('should throw not found when template does not exist', async () => {
    const command = new UpdateSkillTemplateCommand({
      skillTemplateId: mockId,
      name: 'Name',
    });

    repository.findOne.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillTemplateNotFoundError,
    );
  });

  it('should rethrow InvalidSkillTemplateNameError for invalid names', async () => {
    const existing = new SkillTemplate({
      id: mockId,
      name: 'Legal Guidelines',
      shortDescription: 'Description',
      instructions: 'Instructions.',
      distributionMode: DistributionMode.ALWAYS_ON,
    });

    const command = new UpdateSkillTemplateCommand({
      skillTemplateId: mockId,
      name: '  invalid  name  ',
    });

    repository.findOne.mockResolvedValue(existing);
    repository.findByName.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidSkillTemplateNameError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
});
