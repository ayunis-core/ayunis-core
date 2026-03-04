import { SkillTemplateInstallationService } from './skill-template-installation.service';
import type { FindActivePreCreatedTemplatesUseCase } from '../use-cases/find-active-pre-created-templates/find-active-pre-created-templates.use-case';
import type { CreateSkillWithUniqueNameUseCase } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.use-case';
import type { CreateSkillWithUniqueNameCommand } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.command';
import { SkillTemplate } from '../../domain/skill-template.entity';
import { DistributionMode } from '../../domain/distribution-mode.enum';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { randomUUID } from 'crypto';

describe('SkillTemplateInstallationService', () => {
  let service: SkillTemplateInstallationService;
  let findActivePreCreatedTemplatesUseCase: jest.Mocked<FindActivePreCreatedTemplatesUseCase>;
  let createSkillWithUniqueNameUseCase: jest.Mocked<CreateSkillWithUniqueNameUseCase>;

  const userId = randomUUID();

  const mockTemplates: SkillTemplate[] = [
    new SkillTemplate({
      id: randomUUID(),
      name: 'Template A',
      shortDescription: 'Description A',
      instructions: 'Instructions A',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
      isActive: true,
    }),
    new SkillTemplate({
      id: randomUUID(),
      name: 'Template B',
      shortDescription: 'Description B',
      instructions: 'Instructions B',
      distributionMode: DistributionMode.PRE_CREATED_COPY,
      isActive: true,
    }),
  ];

  beforeEach(() => {
    findActivePreCreatedTemplatesUseCase = {
      execute: jest.fn().mockResolvedValue(mockTemplates),
    } as unknown as jest.Mocked<FindActivePreCreatedTemplatesUseCase>;

    createSkillWithUniqueNameUseCase = {
      execute: jest
        .fn()
        .mockImplementation((command: CreateSkillWithUniqueNameCommand) =>
          Promise.resolve(
            new Skill({
              name: command.name,
              shortDescription: command.shortDescription,
              instructions: command.instructions,
              userId: command.userId,
            }),
          ),
        ),
    } as unknown as jest.Mocked<CreateSkillWithUniqueNameUseCase>;

    service = new SkillTemplateInstallationService(
      findActivePreCreatedTemplatesUseCase,
      createSkillWithUniqueNameUseCase,
    );
  });

  it('should install all pre-created templates for a user', async () => {
    const count = await service.installAllPreCreatedForUser(userId);

    expect(count).toBe(2);
    expect(createSkillWithUniqueNameUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createSkillWithUniqueNameUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Template A',
        shortDescription: 'Description A',
        instructions: 'Instructions A',
        userId,
      }),
    );
    expect(createSkillWithUniqueNameUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Template B',
        shortDescription: 'Description B',
        instructions: 'Instructions B',
        userId,
      }),
    );
  });

  it('should return 0 when no templates exist', async () => {
    findActivePreCreatedTemplatesUseCase.execute.mockResolvedValue([]);

    const count = await service.installAllPreCreatedForUser(userId);

    expect(count).toBe(0);
    expect(createSkillWithUniqueNameUseCase.execute).not.toHaveBeenCalled();
  });

  it('should continue on individual template failure', async () => {
    createSkillWithUniqueNameUseCase.execute.mockRejectedValueOnce(
      new Error('DB error'),
    );

    const count = await service.installAllPreCreatedForUser(userId);

    expect(count).toBe(1);
    expect(createSkillWithUniqueNameUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
