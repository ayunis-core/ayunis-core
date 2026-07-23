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
import type { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import type { DataSourceCommandBuilderService } from 'src/domain/sources/application/services/data-source-command-builder.service';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import {
  UnsupportedFileTypeError,
  EmptyFileDataError,
} from '../../skills.errors';
import type { Skill } from '../../../domain/skill.entity';
import type { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

describe('AddFileSourceToSkillUseCase', () => {
  const skillId = randomUUID();
  const updatedSkill = { id: skillId } as Skill;

  let addSourceToSkill: jest.Mocked<AddSourceToSkillUseCase>;
  let startDocumentProcessing: jest.Mocked<StartDocumentProcessingUseCase>;
  let createDataSource: jest.Mocked<CreateDataSourceUseCase>;
  let commandBuilder: jest.Mocked<DataSourceCommandBuilderService>;
  let useCase: AddFileSourceToSkillUseCase;

  function dataSource(id: UUID = randomUUID()): DataSource {
    return { id } as DataSource;
  }

  function csvCommand(name: string): CreateCSVDataSourceCommand {
    return new CreateCSVDataSourceCommand({
      name,
      data: { headers: ['City'], rows: [['Berlin']] },
    });
  }

  beforeEach(() => {
    addSourceToSkill = {
      execute: jest.fn().mockResolvedValue(updatedSkill),
    } as unknown as jest.Mocked<AddSourceToSkillUseCase>;
    startDocumentProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDocumentProcessingUseCase>;
    createDataSource = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateDataSourceUseCase>;
    commandBuilder = {
      buildCsvSourceCommand: jest.fn(),
      buildSpreadsheetSourceCommands: jest.fn(),
    } as unknown as jest.Mocked<DataSourceCommandBuilderService>;

    useCase = new AddFileSourceToSkillUseCase(
      addSourceToSkill,
      startDocumentProcessing,
      createDataSource,
      commandBuilder,
    );
  });

  it('creates a CSV data source and attaches it to the skill', async () => {
    const created = dataSource();
    commandBuilder.buildCsvSourceCommand.mockResolvedValue(
      csvCommand('vereine.csv'),
    );
    createDataSource.execute.mockResolvedValue(created);
    const file = {
      originalname: 'vereine.csv',
      mimetype: 'text/csv',
      path: '/uploads/upload-1',
    };

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand(skillId, file),
    );

    expect(result).toBe(updatedSkill);
    expect(addSourceToSkill.execute).toHaveBeenCalledWith(
      expect.objectContaining({ skillId, sourceId: created.id }),
    );
  });

  it('attaches every sheet of a spreadsheet and returns the updated skill', async () => {
    const first = dataSource();
    const second = dataSource();
    commandBuilder.buildSpreadsheetSourceCommands.mockResolvedValue([
      csvCommand('gebuehren_2026.csv'),
      csvCommand('gebuehren_2027.csv'),
    ]);
    createDataSource.execute
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const file = {
      originalname: 'gebuehren.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-2',
    };

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand(skillId, file),
    );

    expect(result).toBe(updatedSkill);
    expect(addSourceToSkill.execute).toHaveBeenCalledTimes(2);
    expect(addSourceToSkill.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ skillId, sourceId: second.id }),
    );
  });

  it('rejects a spreadsheet that yields no sheets', async () => {
    commandBuilder.buildSpreadsheetSourceCommands.mockResolvedValue([]);
    const file = {
      originalname: 'leer.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-3',
    };

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand(skillId, file)),
    ).rejects.toThrow(EmptyFileDataError);
    expect(addSourceToSkill.execute).not.toHaveBeenCalled();
  });

  it('starts document processing for a PDF and attaches the source', async () => {
    const created = { id: randomUUID() } as FileSource;
    startDocumentProcessing.execute.mockResolvedValue(created);
    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from('%PDF-1.7'));
    const file = {
      originalname: 'satzung.pdf',
      mimetype: 'application/pdf',
      path: '/uploads/upload-5',
    };

    const result = await useCase.execute(
      new AddFileSourceToSkillCommand(skillId, file),
    );

    expect(result).toBe(updatedSkill);
    expect(addSourceToSkill.execute).toHaveBeenCalledWith(
      expect.objectContaining({ skillId, sourceId: created.id }),
    );
    readFile.mockRestore();
  });

  it('rejects unsupported file types without touching the skill', async () => {
    const file = {
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      path: '/uploads/upload-4',
    };

    await expect(
      useCase.execute(new AddFileSourceToSkillCommand(skillId, file)),
    ).rejects.toThrow(UnsupportedFileTypeError);
    expect(addSourceToSkill.execute).not.toHaveBeenCalled();
  });
});
