import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RetrieveFileContentUseCase } from './retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import type { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../../domain/file-retriever-result.entity';
import { ContextService } from 'src/common/context/services/context.service';
import retrievalConfig from 'src/config/retrieval.config';

describe('ProcessFileUseCase', () => {
  let useCase: RetrieveFileContentUseCase;
  let mockHandler: Partial<FileRetrieverHandler>;
  let mockRegistry: Partial<FileRetrieverRegistry>;
  let mockContextService: Partial<ContextService>;

  const mockRetrievalConfig = {
    mistral: {
      apiKey: undefined,
    },
    docling: {
      serviceUrl: undefined,
      apiKey: undefined,
    },
  };

  beforeAll(async () => {
    mockHandler = { processFile: jest.fn() };
    mockRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    };
    mockContextService = {
      get: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        { provide: FileRetrieverRegistry, useValue: mockRegistry },
        { provide: ContextService, useValue: mockContextService },
        { provide: retrievalConfig.KEY, useValue: mockRetrievalConfig },
      ],
    }).compile();

    useCase = module.get<RetrieveFileContentUseCase>(
      RetrieveFileContentUseCase,
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return UTF-8 text content directly for TXT files', async () => {
    const textContent = 'Hello, this is plain text content.\nLine two.';
    const command = new RetrieveFileContentCommand({
      fileData: Buffer.from(textContent, 'utf8'),
      fileName: 'notes.txt',
      fileType: 'text/plain',
    });

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(FileRetrieverResult);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toBeInstanceOf(FileRetrieverPage);
    expect(result.pages[0].text).toBe(textContent);
    expect(result.pages[0].number).toBe(1);
    expect(mockHandler.processFile).not.toHaveBeenCalled();
  });

  it('should strip UTF-8 BOM from TXT files', async () => {
    const textContent = 'Hello, BOM test content.';
    const bomBuffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(textContent, 'utf8'),
    ]);
    const command = new RetrieveFileContentCommand({
      fileData: bomBuffer,
      fileName: 'bom-file.txt',
      fileType: 'text/plain',
    });

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(FileRetrieverResult);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].text).toBe(textContent);
    expect(result.pages[0].text).not.toMatch(/^\uFEFF/);
    expect(mockHandler.processFile).not.toHaveBeenCalled();
  });

  it('should process file successfully', async () => {
    const command = new RetrieveFileContentCommand({
      fileData: Buffer.from('test file content'),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
    });
    const expectedResult = new FileRetrieverResult([
      new FileRetrieverPage('processed content', 1),
    ]);

    jest.spyOn(mockHandler, 'processFile').mockResolvedValue(expectedResult);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResult);
    expect(mockHandler.processFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileData: command.fileData,
        filename: command.fileName,
        fileType: command.fileType,
      }),
    );
  });
});
