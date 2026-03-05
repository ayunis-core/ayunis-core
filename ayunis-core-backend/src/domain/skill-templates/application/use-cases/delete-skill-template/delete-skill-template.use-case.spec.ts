import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DeleteSkillTemplateUseCase } from './delete-skill-template.use-case';
import { DeleteSkillTemplateCommand } from './delete-skill-template.command';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { SkillTemplateNotFoundError } from '../../skill-templates.errors';

describe('DeleteSkillTemplateUseCase', () => {
  let useCase: DeleteSkillTemplateUseCase;
  let repository: jest.Mocked<SkillTemplateRepository>;

  const mockId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeAll(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSkillTemplateUseCase,
        { provide: SkillTemplateRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<DeleteSkillTemplateUseCase>(
      DeleteSkillTemplateUseCase,
    );
    repository = module.get(SkillTemplateRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a skill template successfully', async () => {
    const existing = new AlwaysOnSkillTemplate({
      id: mockId,
      name: 'Legal Guidelines',
      shortDescription: 'Description',
      instructions: 'Instructions.',
    });

    repository.findOne.mockResolvedValue(existing);
    repository.delete.mockResolvedValue(undefined);

    await useCase.execute(
      new DeleteSkillTemplateCommand({ skillTemplateId: mockId }),
    );

    expect(repository.findOne).toHaveBeenCalledWith(mockId);
    expect(repository.delete).toHaveBeenCalledWith(mockId);
  });

  it('should throw not found when template does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new DeleteSkillTemplateCommand({ skillTemplateId: mockId }),
      ),
    ).rejects.toThrow(SkillTemplateNotFoundError);

    expect(repository.delete).not.toHaveBeenCalled();
  });
});
