import { Appsignal } from '@appsignal/nodejs';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import type { UUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Readable } from 'stream';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { StartDocumentProcessingUseCase } from './start-document-processing.use-case';
import { StartDocumentProcessingCommand } from './start-document-processing.command';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { EnqueueDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { extractionConfig } from 'src/config/extraction.config';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import {
  StorageUnavailableError,
  UploadFailedError,
} from 'src/domain/storage/application/storage.errors';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { metrics: jest.fn() } },
}));

describe('StartDocumentProcessingUseCase', () => {
  const metrics = { addDistributionValue: jest.fn() };
  let useCase: StartDocumentProcessingUseCase;
  let mockCreateProcessingSourceUseCase: jest.Mocked<CreateProcessingSourceUseCase>;
  let mockMarkSourceFailedUseCase: jest.Mocked<MarkSourceFailedUseCase>;
  let mockUploadObjectUseCase: jest.Mocked<UploadOrgObjectUseCase>;
  let mockDeleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;
  let mockEnqueueDocumentProcessingUseCase: jest.Mocked<EnqueueDocumentProcessingUseCase>;
  let mockGetPermittedEmbeddingModelUseCase: jest.Mocked<GetPermittedEmbeddingModelUseCase>;
  let mockPreflightCheckUseCase: jest.Mocked<PreflightCheckUseCase>;
  let mockContextService: jest.Mocked<ContextService>;
  const extraction = { url: undefined as string | undefined };

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const pdfContent = 'fake pdf content';
  let dir: string;
  let pdfPath: string;

  async function drainUpload(command: {
    data: Buffer | NodeJS.ReadableStream;
  }) {
    let bytes = 0;
    for await (const chunk of command.data as Readable) {
      bytes += (chunk as Buffer).length;
    }
    return bytes;
  }

  beforeAll(async () => {
    dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'start-doc-'));
    pdfPath = path.join(dir, 'upload.pdf');
    await fs.promises.writeFile(pdfPath, pdfContent);
  });

  afterAll(async () => {
    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  function buildProcessingSource(
    overrides: Partial<{ name: string }> = {},
  ): FileSource {
    return new FileSource({
      fileType: FileType.PDF,
      name: overrides.name ?? 'Protokoll.pdf',
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });
  }

  beforeEach(async () => {
    mockCreateProcessingSourceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProcessingSourceUseCase>;

    mockMarkSourceFailedUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MarkSourceFailedUseCase>;

    mockUploadObjectUseCase = {
      execute: jest.fn().mockImplementation(drainUpload),
    } as unknown as jest.Mocked<UploadOrgObjectUseCase>;

    mockDeleteObjectUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteObjectUseCase>;

    mockEnqueueDocumentProcessingUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EnqueueDocumentProcessingUseCase>;

    mockGetPermittedEmbeddingModelUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<GetPermittedEmbeddingModelUseCase>;

    mockPreflightCheckUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PreflightCheckUseCase>;

    mockContextService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'orgId') return orgId;
        if (key === 'userId') return userId;
        return undefined;
      }),
      set: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;
    metrics.addDistributionValue.mockReset();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);

    mockCreateProcessingSourceUseCase.execute.mockImplementation(async (cmd) =>
      buildProcessingSource({ name: cmd.fileName }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartDocumentProcessingUseCase,
        {
          provide: CreateProcessingSourceUseCase,
          useValue: mockCreateProcessingSourceUseCase,
        },
        {
          provide: MarkSourceFailedUseCase,
          useValue: mockMarkSourceFailedUseCase,
        },
        { provide: UploadOrgObjectUseCase, useValue: mockUploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
        {
          provide: EnqueueDocumentProcessingUseCase,
          useValue: mockEnqueueDocumentProcessingUseCase,
        },
        {
          provide: GetPermittedEmbeddingModelUseCase,
          useValue: mockGetPermittedEmbeddingModelUseCase,
        },
        {
          provide: PreflightCheckUseCase,
          useValue: mockPreflightCheckUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
        { provide: extractionConfig.KEY, useValue: extraction },
      ],
    }).compile();

    useCase = module.get(StartDocumentProcessingUseCase);
    extraction.url = undefined;
  });

  it('should create a PROCESSING source, upload to MinIO, and enqueue job', async () => {
    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Protokoll_März_2025.pdf',
      fileType: 'application/pdf',
    });

    const result = await useCase.execute(command);

    // Source created with PROCESSING status
    expect(result.status).toBe(SourceStatus.PROCESSING);
    expect(result.name).toBe('Protokoll_März_2025.pdf');

    // Source created via use case
    expect(mockCreateProcessingSourceUseCase.execute).toHaveBeenCalledTimes(1);

    // File uploaded to MinIO with correct path
    expect(mockUploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
    const uploadCall = mockUploadObjectUseCase.execute.mock.calls[0][0];
    expect(uploadCall.orgId).toBe(orgId);
    expect(uploadCall.objectName).toContain(`${orgId}/processing/`);
    expect(uploadCall.objectName).toContain('Protokoll_M_rz_2025.pdf');

    // Job enqueued with correct params, including the hash computed while streaming
    expect(mockEnqueueDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: result.id,
        orgId,
        userId,
        sha256: createHash('sha256').update(pdfContent).digest('hex'),
        fileName: 'Protokoll_März_2025.pdf',
        fileType: 'application/pdf',
      }),
    );
  });

  it('streams the upload with its byte length instead of buffering it', async () => {
    await useCase.execute(
      new StartDocumentProcessingCommand({
        filePath: pdfPath,
        fileName: 'Protokoll.pdf',
        fileType: 'application/pdf',
      }),
    );

    const uploadCall = mockUploadObjectUseCase.execute.mock.calls[0][0];
    expect(Buffer.isBuffer(uploadCall.data)).toBe(false);
    expect(uploadCall.size).toBe(pdfContent.length);
  });

  it('reads only a PDF into memory for the page-count preflight', async () => {
    await useCase.execute(
      new StartDocumentProcessingCommand({
        filePath: pdfPath,
        fileName: 'Vorlage.docx',
        fileType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    expect(mockPreflightCheckUseCase.execute).not.toHaveBeenCalled();
    expect(mockEnqueueDocumentProcessingUseCase.execute).toHaveBeenCalled();
  });

  it('leaves page counting to the extraction service for a PDF it will process', async () => {
    extraction.url = 'https://extraction:8000';

    await useCase.execute(
      new StartDocumentProcessingCommand({
        filePath: pdfPath,
        fileName: 'Protokoll.pdf',
        fileType: 'application/pdf',
      }),
    );

    expect(mockPreflightCheckUseCase.execute).not.toHaveBeenCalled();
    expect(mockEnqueueDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ fileSizeBytes: pdfContent.length }),
    );
  });

  it('stages a 200 MB upload without the API process holding the file', async () => {
    const size = 200 * 1024 * 1024;
    const largePath = path.join(dir, 'large.docx');
    await fs.promises.writeFile(largePath, '');
    await fs.promises.truncate(largePath, size);
    const megabyte = Buffer.alloc(1024 * 1024);
    const zerosHash = createHash('sha256');
    for (let i = 0; i < 200; i += 1) zerosHash.update(megabyte);
    let uploadedBytes = 0;
    mockUploadObjectUseCase.execute.mockImplementation(async (command) => {
      uploadedBytes = await drainUpload(command);
      return {} as never;
    });
    const before = process.memoryUsage();

    await useCase.execute(
      new StartDocumentProcessingCommand({
        filePath: largePath,
        fileName: 'large.docx',
        fileType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    const after = process.memoryUsage();
    expect(uploadedBytes).toBe(size);
    expect(
      after.heapUsed +
        after.arrayBuffers -
        before.heapUsed -
        before.arrayBuffers,
    ).toBeLessThan(64 * 1024 * 1024);
    expect(mockEnqueueDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sha256: zerosHash.digest('hex') }),
    );
  });

  it('reports preflight and upload timings under the new source id', async () => {
    const logger = createLoggerMock();
    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Bebauungsplan.pdf',
      fileType: 'application/pdf',
    });

    const result = await useCase.execute(command);

    expect(mockContextService.set).toHaveBeenCalledWith('sourceId', result.id);
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: result.id,
        fileType: 'pdf',
        fileSizeBytes: 16,
        preflightMs: expect.any(Number),
        uploadMs: expect.any(Number),
      }),
      'Document accepted for processing',
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_stage_duration_ms',
      expect.any(Number),
      { stage: 'preflight', file_type: 'pdf' },
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_stage_duration_ms',
      expect.any(Number),
      { stage: 'upload', file_type: 'pdf' },
    );
  });

  it('should mark source as FAILED when MinIO upload fails', async () => {
    mockUploadObjectUseCase.execute.mockRejectedValue(new UploadFailedError());

    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should be marked as FAILED
    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: 'Failed to upload file to storage',
        errorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
      }),
    );

    // MinIO file should NOT be cleaned up (upload failed, nothing to clean)
    expect(mockDeleteObjectUseCase.execute).not.toHaveBeenCalled();
    // The rejected upload never read the stream; the file must not stay open.
    const upload = mockUploadObjectUseCase.execute.mock.calls[0][0];
    expect((upload.data as Readable).destroyed).toBe(true);
  });

  it('marks the source unavailable, not failed, when object storage is down', async () => {
    const storageOutage = new StorageUnavailableError({
      diagnostics: { upstreamCode: 'ECONNREFUSED' },
    });
    mockUploadObjectUseCase.execute.mockRejectedValue(storageOutage);

    await expect(
      useCase.execute(
        new StartDocumentProcessingCommand({
          filePath: pdfPath,
          fileName: 'Protokoll.pdf',
          fileType: 'application/pdf',
        }),
      ),
    ).rejects.toBe(storageOutage);

    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
      }),
    );
  });

  it('should mark source as FAILED and clean up MinIO when enqueue fails', async () => {
    mockEnqueueDocumentProcessingUseCase.execute.mockRejectedValue(
      new Error('Redis connection refused'),
    );

    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should be marked as FAILED
    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: 'Failed to enqueue processing job',
      }),
    );

    // MinIO file should be cleaned up
    expect(mockDeleteObjectUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should reject before creating a source when the preflight check fails', async () => {
    mockPreflightCheckUseCase.execute.mockRejectedValue(
      new TooManyPagesError({ pageCount: 1486, maxPages: 1000 }),
    );

    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Haushaltsplan.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(TooManyPagesError);

    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
    expect(mockUploadObjectUseCase.execute).not.toHaveBeenCalled();
    expect(mockEnqueueDocumentProcessingUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject before creating a source when the org has no permitted embedding model', async () => {
    mockGetPermittedEmbeddingModelUseCase.execute.mockRejectedValue(
      new PermittedEmbeddingModelNotFoundForOrgError(orgId),
    );

    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      PermittedEmbeddingModelNotFoundForOrgError,
    );

    // Nothing was created, uploaded, or enqueued
    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
    expect(mockUploadObjectUseCase.execute).not.toHaveBeenCalled();
    expect(mockEnqueueDocumentProcessingUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw when orgId is missing from context', async () => {
    mockContextService.get.mockReturnValue(undefined);

    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // No source should be created
    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw when userId is missing from context', async () => {
    mockContextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'orgId') return orgId;
      return undefined;
    });

    const command = new StartDocumentProcessingCommand({
      filePath: pdfPath,
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // No source should be created
    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
  });
});
