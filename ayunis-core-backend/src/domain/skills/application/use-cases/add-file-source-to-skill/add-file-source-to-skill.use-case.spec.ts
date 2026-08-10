import * as fs from 'fs';
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
import type { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import type { StartDataSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-data-source-processing/start-data-source-processing.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import type { SkillRepository } from '../../ports/skill.repository';
import {
  SkillSourceLimitExceededError,
  UnsupportedFileTypeError,
} from '../../skills.errors';
import { SkillsConstants } from '../../../domain/skills.constants';
import type { Skill } from '../../../domain/skill.entity';
import type { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

describe('AddFileSourceToSkillUseCase', () => {
  const skillId = randomUUID();
  const userId = randomUUID();
  const orgId = randomUUID();
  const updatedSkill = { id: skillId } as Skill;

  let skillRepository: jest.Mocked<SkillRepository>;
  let addSourceToSkill: jest.Mocked<AddSourceToSkillUseCase>;
  let startDocumentProcessing: jest.Mocked<StartDocumentProcessingUseCase>;
  let startDataSourceProcessing: jest.Mocked<StartDataSourceProcessingUseCase>;
  let deleteSources: jest.Mocked<DeleteSourcesUseCase>;
  let useCase: AddFileSourceToSkillUseCase;
  let readFile: jest.SpyInstance;

  function dataSource(id: UUID = randomUUID()): CSVDataSource {
    return { id } as CSVDataSource;
  }

  beforeEach(() => {
    skillRepository = {
      findOne: jest.fn().mockResolvedValue({ id: skillId, sourceIds: [] }),
    } as unknown as jest.Mocked<SkillRepository>;
    addSourceToSkill = {
      execute: jest.fn().mockResolvedValue(updatedSkill),
    } as unknown as jest.Mocked<AddSourceToSkillUseCase>;
    startDocumentProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDocumentProcessingUseCase>;
    startDataSourceProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDataSourceProcessingUseCase>;
    deleteSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteSourcesUseCase>;
    readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from('file-bytes'));

    const contextService = {
      get: jest.fn((key: string) => (key === 'orgId' ? orgId : userId)),
    } as unknown as ContextService;

    useCase = new AddFileSourceToSkillUseCase(
      skillRepository,
      addSourceToSkill,
      startDocumentProcessing,
      startDataSourceProcessing,
      deleteSources,
      contextService,
    );
  });

  afterEach(() => {
    readFile.mockRestore();
  });

  it('rejects a skill at the source cap before any processing starts', async () => {
    skillRepository.findOne.mockResolvedValue({
      id: skillId,
      sourceIds: Array.from({ length: SkillsConstants.MAX_SOURCES }, () =>
        randomUUID(),
      ),
    } as unknown as Skill);
    const file = {
      originalname: 'bericht.pdf',
      mimetype: 'application/pdf',
      path: '/uploads/upload-0',
    };

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toBeInstanceOf(SkillSourceLimitExceededError);
    expect(startDocumentProcessing.execute).not.toHaveBeenCalled();
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
  });

  it('passes a capacity check that accounts for every sheet of a workbook', async () => {
    skillRepository.findOne.mockResolvedValue({
      id: skillId,
      sourceIds: Array.from({ length: SkillsConstants.MAX_SOURCES - 1 }, () =>
        randomUUID(),
      ),
    } as unknown as Skill);
    // One slot left, workbook has two sheets — the callback must throw.
    startDataSourceProcessing.execute.mockImplementation(
      (command: { ensureCapacityFor?: (count: number) => void }) => {
        command.ensureCapacityFor?.(2);
        return Promise.resolve([dataSource(), dataSource()]);
      },
    );
    const file = {
      originalname: 'haushalt.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-7',
    };

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toBeInstanceOf(SkillSourceLimitExceededError);
    expect(addSourceToSkill.execute).not.toHaveBeenCalled();
  });

  it('starts async CSV processing and attaches the source', async () => {
    const created = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([created]);
    const file = {
      originalname: 'vereine.csv',
      mimetype: 'text/csv',
      path: '/uploads/upload-1',
    };

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand({ skillId, file }),
    );

    expect(result).toBe(updatedSkill);
    expect(startDataSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'vereine.csv', kind: 'csv' }),
    );
    expect(addSourceToSkill.execute).toHaveBeenCalledWith(
      expect.objectContaining({ skillId, sourceId: created.id }),
    );
  });

  it('attaches every pre-created sheet source of a spreadsheet', async () => {
    const first = dataSource();
    const second = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([first, second]);
    const file = {
      originalname: 'gebuehren.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-2',
    };

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand({ skillId, file }),
    );

    expect(result).toBe(updatedSkill);
    expect(startDataSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'gebuehren.xlsx',
        kind: 'spreadsheet',
      }),
    );
    expect(addSourceToSkill.execute).toHaveBeenCalledTimes(2);
    expect(addSourceToSkill.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ skillId, sourceId: second.id }),
    );
  });

  it('starts document processing for a PDF and attaches the source', async () => {
    const created = { id: randomUUID() } as FileSource;
    startDocumentProcessing.execute.mockResolvedValue(created);
    const file = {
      originalname: 'satzung.pdf',
      mimetype: 'application/pdf',
      path: '/uploads/upload-5',
    };

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand({ skillId, file }),
    );

    expect(result).toBe(updatedSkill);
    expect(addSourceToSkill.execute).toHaveBeenCalledWith(
      expect.objectContaining({ skillId, sourceId: created.id }),
    );
  });

  it('deletes the pre-created sources when attaching to the skill fails', async () => {
    const created = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([created]);
    addSourceToSkill.execute.mockRejectedValue(
      new Error('max sources exceeded'),
    );
    const file = {
      originalname: 'vereine.csv',
      mimetype: 'text/csv',
      path: '/uploads/upload-6',
    };

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toThrow();

    expect(deleteSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [created.id], orgId }),
    );
  });

  it('rejects unsupported file types without touching the skill', async () => {
    const file = {
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      path: '/uploads/upload-4',
    };

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand({ skillId, file })),
    ).rejects.toThrow(UnsupportedFileTypeError);
    expect(addSourceToSkill.execute).not.toHaveBeenCalled();
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
  });
});
