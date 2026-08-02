import * as fs from 'fs';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { StartFileSourceProcessingUseCase } from './start-file-source-processing.use-case';
import { StartFileSourceProcessingCommand } from './start-file-source-processing.command';
import type { StartDocumentProcessingUseCase } from '../start-document-processing/start-document-processing.use-case';
import type { StartDataSourceProcessingUseCase } from '../start-data-source-processing/start-data-source-processing.use-case';
import {
  TabularFileTooLargeError,
  UnsupportedFileTypeError,
} from '../../sources.errors';
import type { CSVDataSource } from '../../../domain/sources/data-source.entity';
import type { FileSource } from '../../../domain/sources/text-source.entity';

describe('StartFileSourceProcessingUseCase', () => {
  let startDocumentProcessing: jest.Mocked<StartDocumentProcessingUseCase>;
  let startDataSourceProcessing: jest.Mocked<StartDataSourceProcessingUseCase>;
  let useCase: StartFileSourceProcessingUseCase;
  let readFile: jest.SpyInstance;

  function dataSource(id: UUID = randomUUID()): CSVDataSource {
    return { id } as CSVDataSource;
  }

  beforeEach(() => {
    startDocumentProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDocumentProcessingUseCase>;
    startDataSourceProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDataSourceProcessingUseCase>;
    readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from('file-bytes'));

    useCase = new StartFileSourceProcessingUseCase(
      startDocumentProcessing,
      startDataSourceProcessing,
    );
  });

  afterEach(() => {
    readFile.mockRestore();
  });

  it('routes a PDF to the document pipeline', async () => {
    const created = { id: randomUUID() } as FileSource;
    startDocumentProcessing.execute.mockResolvedValue(created);

    const result = await useCase.execute(
      new StartFileSourceProcessingCommand({
        originalname: 'satzung.pdf',
        mimetype: 'application/pdf',
        path: '/uploads/upload-1',
      }),
    );

    expect(result).toEqual([created]);
    expect(startDocumentProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'satzung.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
  });

  it('routes a CSV to the data-source pipeline', async () => {
    const created = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([created]);

    const result = await useCase.execute(
      new StartFileSourceProcessingCommand({
        originalname: 'einwohner.csv',
        mimetype: 'text/csv',
        path: '/uploads/upload-2',
      }),
    );

    expect(result).toEqual([created]);
    expect(startDataSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'einwohner.csv', kind: 'csv' }),
    );
  });

  it('routes a spreadsheet to the data-source pipeline as kind spreadsheet', async () => {
    const first = dataSource();
    const second = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([first, second]);

    const result = await useCase.execute(
      new StartFileSourceProcessingCommand({
        originalname: 'haushalt.xlsx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: '/uploads/upload-3',
      }),
    );

    expect(result).toEqual([first, second]);
    expect(startDataSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'haushalt.xlsx',
        kind: 'spreadsheet',
      }),
    );
  });

  it('rejects a tabular file above the 25 MB cap before starting processing', async () => {
    readFile.mockResolvedValue(Buffer.alloc(26 * 1024 * 1024));

    await expect(
      useCase.execute(
        new StartFileSourceProcessingCommand({
          originalname: 'riesig.xlsx',
          mimetype:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          path: '/uploads/upload-4',
        }),
      ),
    ).rejects.toThrow(TabularFileTooLargeError);
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
  });

  it('rejects unsupported file types', async () => {
    await expect(
      useCase.execute(
        new StartFileSourceProcessingCommand({
          originalname: 'video.mp4',
          mimetype: 'video/mp4',
          path: '/uploads/upload-5',
        }),
      ),
    ).rejects.toThrow(UnsupportedFileTypeError);
    expect(startDocumentProcessing.execute).not.toHaveBeenCalled();
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
  });
});
