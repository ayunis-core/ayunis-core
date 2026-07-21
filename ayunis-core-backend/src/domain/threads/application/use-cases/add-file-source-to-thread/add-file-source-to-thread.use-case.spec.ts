import * as fs from 'fs';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { AddFileSourceToThreadUseCase } from './add-file-source-to-thread.use-case';
import { AddFileSourceToThreadCommand } from './add-file-source-to-thread.command';
import type { FindThreadUseCase } from '../find-thread/find-thread.use-case';
import type { AddSourceToThreadUseCase } from '../add-source-to-thread/add-source-to-thread.use-case';
import type { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import type { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import type { DataSourceCommandBuilderService } from 'src/domain/sources/application/services/data-source-command-builder.service';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import {
  UnsupportedFileTypeError,
  EmptyFileDataError,
} from 'src/domain/sources/application/sources.errors';
import type { Thread } from '../../../domain/thread.entity';
import type { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

describe('AddFileSourceToThreadUseCase', () => {
  const threadId = randomUUID();
  const thread = { id: threadId } as Thread;

  let findThread: jest.Mocked<FindThreadUseCase>;
  let addSourceToThread: jest.Mocked<AddSourceToThreadUseCase>;
  let startDocumentProcessing: jest.Mocked<StartDocumentProcessingUseCase>;
  let createDataSource: jest.Mocked<CreateDataSourceUseCase>;
  let commandBuilder: jest.Mocked<DataSourceCommandBuilderService>;
  let useCase: AddFileSourceToThreadUseCase;

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
    findThread = {
      execute: jest.fn().mockResolvedValue({ thread }),
    } as unknown as jest.Mocked<FindThreadUseCase>;
    addSourceToThread = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AddSourceToThreadUseCase>;
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

    useCase = new AddFileSourceToThreadUseCase(
      findThread,
      addSourceToThread,
      startDocumentProcessing,
      createDataSource,
      commandBuilder,
    );
  });

  it('creates a CSV data source and attaches it to the thread', async () => {
    const created = dataSource();
    commandBuilder.buildCsvSourceCommand.mockResolvedValue(
      csvCommand('einwohner.csv'),
    );
    createDataSource.execute.mockResolvedValue(created);
    const file = {
      originalname: 'einwohner.csv',
      mimetype: 'text/csv',
      path: '/uploads/upload-1',
    };

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand(threadId, file),
    );

    expect(result).toEqual([created]);
    expect(addSourceToThread.execute).toHaveBeenCalledWith(
      expect.objectContaining({ thread, source: created }),
    );
  });

  it('creates one source per sheet for a spreadsheet upload', async () => {
    const first = dataSource();
    const second = dataSource();
    commandBuilder.buildSpreadsheetSourceCommands.mockResolvedValue([
      csvCommand('haushalt_2026.csv'),
      csvCommand('haushalt_2027.csv'),
    ]);
    createDataSource.execute
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const file = {
      originalname: 'haushalt.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-2',
    };

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand(threadId, file),
    );

    expect(result).toEqual([first, second]);
    expect(addSourceToThread.execute).toHaveBeenCalledTimes(2);
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
      useCase.execute(new AddFileSourceToThreadCommand(threadId, file)),
    ).rejects.toThrow(EmptyFileDataError);
    expect(createDataSource.execute).not.toHaveBeenCalled();
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
      path: '/uploads/upload-4',
    };

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand(threadId, file),
    );

    expect(result).toEqual([created]);
    expect(addSourceToThread.execute).toHaveBeenCalledWith(
      expect.objectContaining({ thread, source: created }),
    );
    readFile.mockRestore();
  });

  it('rejects unsupported file types without touching the thread', async () => {
    const file = {
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      path: '/uploads/upload-5',
    };

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand(threadId, file)),
    ).rejects.toThrow(UnsupportedFileTypeError);
    expect(addSourceToThread.execute).not.toHaveBeenCalled();
  });
});
