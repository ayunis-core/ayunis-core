import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreateFileSourceUseCase } from './create-file-source.use-case';
import { CreateFileSourceCommand } from './create-file-source.command';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { ProcessFileUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/process-file/process-file.use-case';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { IngestContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-content/ingest-content.use-case';
import { FileSource } from '../../../domain/sources/file-source.entity';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';

describe('CreateFileSourceUseCase', () => {
  let useCase: CreateFileSourceUseCase;
  let sourceRepository: jest.Mocked<SourceRepository>;
  let processFileUseCase: jest.Mocked<ProcessFileUseCase>;
  let splitTextUseCase: jest.Mocked<SplitTextUseCase>;
  let ingestContentUseCase: jest.Mocked<IngestContentUseCase>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockSourceId = '123e4567-e89b-12d3-a456-426614174001' as any;

  beforeEach(async () => {
    const mockSourceRepository = {
      create: jest.fn(),
      createFileSource: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    };

    const mockProcessFileUseCase = {
      execute: jest.fn(),
    };

    const mockSplitTextUseCase = {
      execute: jest.fn(),
    };

    const mockIngestContentUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFileSourceUseCase,
        { provide: SOURCE_REPOSITORY, useValue: mockSourceRepository },
        { provide: ProcessFileUseCase, useValue: mockProcessFileUseCase },
        { provide: SplitTextUseCase, useValue: mockSplitTextUseCase },
        { provide: IngestContentUseCase, useValue: mockIngestContentUseCase },
      ],
    }).compile();

    useCase = module.get<CreateFileSourceUseCase>(CreateFileSourceUseCase);
    sourceRepository = module.get(SOURCE_REPOSITORY);
    processFileUseCase = module.get(ProcessFileUseCase);
    splitTextUseCase = module.get(SplitTextUseCase);
    ingestContentUseCase = module.get(IngestContentUseCase);

    // Mock logger
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create file source successfully', async () => {
      // Arrange
      const command = new CreateFileSourceCommand({
        orgId: mockOrgId,
        fileData: Buffer.from('test file content'),
        fileName: 'test-file.txt',
        fileType: 'text/plain',
        fileSize: 100,
      });

      const mockProcessFileResult = {
        pages: [
          { number: 1, text: 'Page 1 content', metadata: {} },
          { number: 2, text: 'Page 2 content', metadata: {} },
        ],
        metadata: {},
      } as any;

      const mockSplitTextResult = {
        chunks: [
          { text: 'Chunk 1', metadata: {} },
          { text: 'Chunk 2', metadata: {} },
        ],
        metadata: {},
      } as any;

      processFileUseCase.execute.mockResolvedValue(mockProcessFileResult);
      splitTextUseCase.execute.mockReturnValue(mockSplitTextResult);

      // Mock repository calls
      const mockFileSource = new FileSource({
        fileType: command.fileType,
        fileSize: command.fileSize,
        fileName: command.fileName,
        text: 'Page 1 content\nPage 2 content',
        content: [],
      });
      mockFileSource.id = mockSourceId;

      sourceRepository.create.mockResolvedValue(mockFileSource);
      sourceRepository.createFileSource.mockResolvedValue({
        ...mockFileSource,
        content: [{ id: 'c1' }],
      } as any);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(processFileUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          fileData: command.fileData,
          fileName: command.fileName,
          fileType: command.fileType,
        }),
      );

      expect(sourceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileType: command.fileType,
          fileSize: command.fileSize,
          text: 'Page 1 content\nPage 2 content',
        }),
      );

      expect(splitTextUseCase.execute).toHaveBeenCalledTimes(2);
      expect(splitTextUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
          type: SplitterType.RECURSIVE,
          metadata: {
            chunkSize: 2000,
            chunkOverlap: 200,
          },
        }),
      );

      expect(sourceRepository.createFileSource).toHaveBeenCalled();
      expect(ingestContentUseCase.execute).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should handle single page files', async () => {
      // Arrange
      const command = new CreateFileSourceCommand({
        orgId: mockOrgId,
        fileData: Buffer.from('single page content'),
        fileName: 'single-page.txt',
        fileType: 'text/plain',
        fileSize: 50,
      });

      const mockProcessFileResult = {
        pages: [{ number: 1, text: 'Single page content', metadata: {} }],
        metadata: {},
      } as any;

      const mockSplitTextResult = {
        chunks: [{ text: 'Single chunk', metadata: {} }],
        metadata: {},
      } as any;

      processFileUseCase.execute.mockResolvedValue(mockProcessFileResult);
      splitTextUseCase.execute.mockReturnValue(mockSplitTextResult);

      const mockFileSource = new FileSource({
        fileType: command.fileType,
        fileSize: command.fileSize,
        fileName: command.fileName,
        text: 'Single page content',
        content: [],
      });
      mockFileSource.id = mockSourceId;

      sourceRepository.create.mockResolvedValue(mockFileSource);
      sourceRepository.createFileSource.mockResolvedValue({
        ...mockFileSource,
        content: [{ id: 'c1' }],
      } as any);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeTruthy();
      expect(processFileUseCase.execute).toHaveBeenCalled();
      expect(splitTextUseCase.execute).toHaveBeenCalled();
      expect(ingestContentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          documentId: mockSourceId,
          type: IndexType.PARENT_CHILD,
        }),
      );
    });

    it('should log debug information', async () => {
      // Arrange
      const command = new CreateFileSourceCommand({
        orgId: mockOrgId,
        fileData: Buffer.from('test content'),
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileSize: 30,
      });

      const mockProcessFileResult = {
        pages: [{ number: 1, text: 'Test content', metadata: {} }],
        metadata: {},
      } as any;

      const mockSplitTextResult = {
        chunks: [{ text: 'Test content', metadata: {} }],
        metadata: {},
      } as any;

      processFileUseCase.execute.mockResolvedValue(mockProcessFileResult);
      splitTextUseCase.execute.mockReturnValue(mockSplitTextResult);

      const mockFileSource = new FileSource({
        fileType: command.fileType,
        fileSize: command.fileSize,
        fileName: command.fileName,
        text: 'Test content',
        content: [],
      });
      mockFileSource.id = mockSourceId;

      sourceRepository.create.mockResolvedValue(mockFileSource);
      sourceRepository.createFileSource.mockResolvedValue({
        ...mockFileSource,
        content: [{ id: 'content-1', content: 'Test content' }],
      } as any);

      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(command);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(
        'Creating file source for file: text/plain',
      );
      expect(debugSpy).toHaveBeenCalledWith(
        `Indexing content for source: ${mockSourceId}`,
      );
      expect(debugSpy).toHaveBeenCalledWith(
        `Successfully indexed 1 content blocks for source: ${mockSourceId}`,
      );
    });

    it('should handle processing errors', async () => {
      // Arrange
      const command = new CreateFileSourceCommand({
        orgId: mockOrgId,
        fileData: Buffer.from('test content'),
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileSize: 30,
      });

      const processingError = new Error('Failed to process file');
      processFileUseCase.execute.mockRejectedValue(processingError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to process file',
      );

      expect(processFileUseCase.execute).toHaveBeenCalled();
      expect(sourceRepository.create).not.toHaveBeenCalled();
    });

    it('should handle indexing errors', async () => {
      // Arrange
      const command = new CreateFileSourceCommand({
        orgId: mockOrgId,
        fileData: Buffer.from('test content'),
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileSize: 30,
      });

      const mockProcessFileResult = {
        pages: [{ number: 1, text: 'Test content', metadata: {} }],
        metadata: {},
      } as any;

      const mockSplitTextResult = {
        chunks: [{ text: 'Test content', metadata: {} }],
        metadata: {},
      } as any;

      processFileUseCase.execute.mockResolvedValue(mockProcessFileResult);
      splitTextUseCase.execute.mockReturnValue(mockSplitTextResult);

      const mockFileSource = new FileSource({
        fileType: command.fileType,
        fileSize: command.fileSize,
        fileName: command.fileName,
        text: 'Test content',
        content: [],
      });
      mockFileSource.id = mockSourceId;

      sourceRepository.create.mockResolvedValue(mockFileSource);
      sourceRepository.createFileSource.mockResolvedValue({
        ...mockFileSource,
        content: [{ id: 'content-1', content: 'Test content' }],
      } as any);

      const indexingError = new Error('Indexing failed');
      ingestContentUseCase.execute.mockRejectedValue(indexingError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Indexing failed');

      expect(sourceRepository.createFileSource).toHaveBeenCalled();
      expect(ingestContentUseCase.execute).toHaveBeenCalled();
    });
  });
});
