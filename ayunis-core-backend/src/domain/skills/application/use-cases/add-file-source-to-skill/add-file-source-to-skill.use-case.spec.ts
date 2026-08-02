import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { AddFileSourceToSkillUseCase } from './add-file-source-to-skill.use-case';
import { AddFileSourceToSkillCommand } from './add-file-source-to-skill.command';
import type { AddSourceToSkillUseCase } from '../add-source-to-skill/add-source-to-skill.use-case';
import type { StartFileSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-file-source-processing/start-file-source-processing.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import type { SkillRepository } from '../../ports/skill.repository';
import { SkillSourceLimitExceededError } from '../../skills.errors';
import { SkillsConstants } from '../../../domain/skills.constants';
import type { Skill } from '../../../domain/skill.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';

describe('AddFileSourceToSkillUseCase', () => {
  const skillId = randomUUID();
  const userId = randomUUID();
  const updatedSkill = { id: skillId } as Skill;
  const file = {
    originalname: 'vereine.csv',
    mimetype: 'text/csv',
    path: '/uploads/upload-1',
  };

  let skillRepository: jest.Mocked<SkillRepository>;
  let addSourceToSkill: jest.Mocked<AddSourceToSkillUseCase>;
  let startFileSourceProcessing: jest.Mocked<StartFileSourceProcessingUseCase>;
  let deleteSources: jest.Mocked<DeleteSourcesUseCase>;
  let useCase: AddFileSourceToSkillUseCase;

  function source(id: UUID = randomUUID()): Source {
    return { id } as Source;
  }

  beforeEach(() => {
    skillRepository = {
      findOne: jest.fn().mockResolvedValue({ id: skillId, sourceIds: [] }),
    } as unknown as jest.Mocked<SkillRepository>;
    addSourceToSkill = {
      execute: jest.fn().mockResolvedValue(updatedSkill),
    } as unknown as jest.Mocked<AddSourceToSkillUseCase>;
    startFileSourceProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartFileSourceProcessingUseCase>;
    deleteSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteSourcesUseCase>;
    const contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as ContextService;

    useCase = new AddFileSourceToSkillUseCase(
      skillRepository,
      addSourceToSkill,
      startFileSourceProcessing,
      deleteSources,
      contextService,
    );
  });

  it('rejects a skill at the source cap before any processing starts', async () => {
    skillRepository.findOne.mockResolvedValue({
      id: skillId,
      sourceIds: Array.from({ length: SkillsConstants.MAX_SOURCES }, () =>
        randomUUID(),
      ),
    } as unknown as Skill);

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toBeInstanceOf(SkillSourceLimitExceededError);
    expect(startFileSourceProcessing.execute).not.toHaveBeenCalled();
  });

  it('passes a capacity check that accounts for every sheet of a workbook', async () => {
    skillRepository.findOne.mockResolvedValue({
      id: skillId,
      sourceIds: Array.from({ length: SkillsConstants.MAX_SOURCES - 1 }, () =>
        randomUUID(),
      ),
    } as unknown as Skill);
    // One slot left, workbook has two sheets — the callback must throw.
    startFileSourceProcessing.execute.mockImplementation(
      (command: { ensureCapacityFor?: (count: number) => void }) => {
        command.ensureCapacityFor?.(2);
        return Promise.resolve([source(), source()]);
      },
    );

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toBeInstanceOf(SkillSourceLimitExceededError);
    expect(addSourceToSkill.execute).not.toHaveBeenCalled();
  });

  it('starts processing, attaches every created source, and returns the skill', async () => {
    const first = source();
    const second = source();
    startFileSourceProcessing.execute.mockResolvedValue([first, second]);

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand({ skillId, file }),
    );

    expect(result).toBe(updatedSkill);
    expect(startFileSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ file }),
    );
    expect(addSourceToSkill.execute).toHaveBeenCalledTimes(2);
    expect(addSourceToSkill.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ skillId, sourceId: second.id }),
    );
  });

  it('deletes the pre-created sources when attaching to the skill fails', async () => {
    const created = source();
    startFileSourceProcessing.execute.mockResolvedValue([created]);
    addSourceToSkill.execute.mockRejectedValue(
      new Error('max sources exceeded'),
    );

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toThrow();

    expect(deleteSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [created.id] }),
    );
  });
});
