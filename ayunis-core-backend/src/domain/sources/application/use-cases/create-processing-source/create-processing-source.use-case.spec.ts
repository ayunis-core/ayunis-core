import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateProcessingSourceUseCase } from './create-processing-source.use-case';
import { CreateProcessingSourceCommand } from './create-processing-source.command';
import { SourceRepository } from '../../ports/source.repository';
import { SourceStatus } from '../../../domain/source-status.enum';
import { FileType, TextType } from '../../../domain/source-type.enum';
import { UnsupportedSourceFileTypeError } from '../../sources.errors';

describe('CreateProcessingSourceUseCase', () => {
  let useCase: CreateProcessingSourceUseCase;
  let mockSourceRepository: jest.Mocked<SourceRepository>;

  beforeEach(async () => {
    mockSourceRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByKnowledgeBaseId: jest.fn(),
      findStaleProcessingSources: jest.fn(),
      save: jest.fn().mockImplementation(async (source) => source),
      saveTextSource: jest.fn(),
      extractTextLines: jest.fn(),
      findContentChunksByIds: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as jest.Mocked<SourceRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProcessingSourceUseCase,
        { provide: SourceRepository, useValue: mockSourceRepository },
      ],
    }).compile();

    useCase = module.get(CreateProcessingSourceUseCase);
  });

  it('should create a FileSource with PROCESSING status for PDF', async () => {
    const command = new CreateProcessingSourceCommand({
      fileType: 'application/pdf',
      fileName: 'Stadtratsbeschluss_2025.pdf',
    });

    const result = await useCase.execute(command);

    expect(result.status).toBe(SourceStatus.PROCESSING);
    expect(result.name).toBe('Stadtratsbeschluss_2025.pdf');
    expect(result.fileType).toBe(FileType.PDF);
    expect(result.textType).toBe(TextType.FILE);
    expect(result.processingStartedAt).toBeInstanceOf(Date);
    expect(mockSourceRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should create a FileSource with PROCESSING status for DOCX', async () => {
    const command = new CreateProcessingSourceCommand({
      fileType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: 'Bericht.docx',
    });

    const result = await useCase.execute(command);

    expect(result.fileType).toBe(FileType.DOCX);
    expect(result.status).toBe(SourceStatus.PROCESSING);
  });

  it('should throw UnsupportedSourceFileTypeError for unsupported file types', async () => {
    const command = new CreateProcessingSourceCommand({
      fileType: 'image/jpeg',
      fileName: 'photo.jpg',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      UnsupportedSourceFileTypeError,
    );
  });
});
