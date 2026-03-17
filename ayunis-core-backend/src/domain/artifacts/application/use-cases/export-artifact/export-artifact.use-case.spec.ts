import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';
import { ExportArtifactUseCase } from './export-artifact.use-case';
import { ExportArtifactCommand } from './export-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { DocumentExportPort } from '../../ports/document-export.port';
import { ArtifactNotFoundError } from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { LetterheadNotFoundError } from 'src/domain/letterheads/application/letterheads.errors';

function createBufferStream(buf: Buffer): NodeJS.ReadableStream {
  const readable = new Readable();
  readable.push(buf);
  readable.push(null);
  return readable;
}

describe('ExportArtifactUseCase', () => {
  let useCase: ExportArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let documentExportPort: jest.Mocked<DocumentExportPort>;
  let findLetterheadUseCase: jest.Mocked<FindLetterheadUseCase>;
  let downloadObjectUseCase: jest.Mocked<DownloadObjectUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '423e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockArtifactId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockLetterheadId = '523e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByThreadId: jest.fn(),
      findByIdWithVersions: jest.fn(),
      addVersion: jest.fn(),
      updateCurrentVersionNumber: jest.fn(),
      delete: jest.fn(),
    };

    const mockExportPort = {
      exportToDocx: jest.fn(),
      exportToPdf: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockFindLetterhead = {
      execute: jest.fn(),
    };

    const mockDownloadObject = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: DocumentExportPort, useValue: mockExportPort },
        { provide: ContextService, useValue: mockContextService },
        { provide: FindLetterheadUseCase, useValue: mockFindLetterhead },
        { provide: DownloadObjectUseCase, useValue: mockDownloadObject },
      ],
    }).compile();

    useCase = module.get<ExportArtifactUseCase>(ExportArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);
    documentExportPort = module.get(DocumentExportPort);
    findLetterheadUseCase = module.get(FindLetterheadUseCase);
    downloadObjectUseCase = module.get(DownloadObjectUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createArtifact(overrides?: {
    title?: string;
    letterheadId?: UUID | null;
  }): Artifact {
    return new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: overrides?.title ?? 'Council Meeting Notes',
      letterheadId: overrides?.letterheadId ?? null,
      currentVersionNumber: 1,
      versions: [
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 1,
          content: '<p>Meeting notes content</p>',
          authorType: AuthorType.ASSISTANT,
        }),
      ],
    });
  }

  function createLetterhead(): Letterhead {
    return new Letterhead({
      id: mockLetterheadId,
      orgId: mockOrgId,
      name: 'Stadtbriefpapier',
      firstPageStoragePath: 'letterheads/org1/lh1/first-page.pdf',
      continuationPageStoragePath: 'letterheads/org1/lh1/continuation.pdf',
      firstPageMargins: { top: 55, right: 15, bottom: 20, left: 15 },
      continuationPageMargins: { top: 20, right: 15, bottom: 20, left: 15 },
    });
  }

  it('should export the current version as DOCX', async () => {
    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Annual Report 2026',
      currentVersionNumber: 2,
      versions: [
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 1,
          content: '<p>Old content</p>',
          authorType: AuthorType.ASSISTANT,
        }),
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 2,
          content: '<h1>Annual Report</h1><p>Current content</p>',
          authorType: AuthorType.USER,
          authorId: mockUserId,
        }),
      ],
    });

    const docxBuffer = Buffer.from('fake-docx-content');
    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    documentExportPort.exportToDocx.mockResolvedValue(docxBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'docx',
    });

    const result = await useCase.execute(command);

    expect(result.buffer).toBe(docxBuffer);
    expect(result.fileName).toBe('Annual Report 2026.docx');
    expect(result.mimeType).toContain('wordprocessingml');
    expect(documentExportPort.exportToDocx).toHaveBeenCalledWith(
      '<h1>Annual Report</h1><p>Current content</p>',
    );
    expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledWith(
      mockArtifactId,
      mockUserId,
    );
  });

  it('should export the current version as PDF without letterhead', async () => {
    const artifact = createArtifact();
    const pdfBuffer = Buffer.from('fake-pdf-content');
    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    documentExportPort.exportToPdf.mockResolvedValue(pdfBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    const result = await useCase.execute(command);

    expect(result.buffer).toBe(pdfBuffer);
    expect(result.fileName).toBe('Council Meeting Notes.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(documentExportPort.exportToPdf).toHaveBeenCalledWith(
      '<p>Meeting notes content</p>',
      undefined,
    );
  });

  it('should export PDF with letterhead when artifact has letterheadId', async () => {
    const artifact = createArtifact({ letterheadId: mockLetterheadId });
    const letterhead = createLetterhead();
    const pdfBuffer = Buffer.from('fake-composited-pdf');
    const firstPageBuf = Buffer.from('%PDF-first');
    const contPageBuf = Buffer.from('%PDF-continuation');

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    findLetterheadUseCase.execute.mockResolvedValue(letterhead);
    downloadObjectUseCase.execute
      .mockResolvedValueOnce(createBufferStream(firstPageBuf))
      .mockResolvedValueOnce(createBufferStream(contPageBuf));
    documentExportPort.exportToPdf.mockResolvedValue(pdfBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    const result = await useCase.execute(command);

    expect(result.buffer).toBe(pdfBuffer);
    expect(findLetterheadUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ letterheadId: mockLetterheadId }),
    );
    expect(downloadObjectUseCase.execute).toHaveBeenCalledTimes(2);
    expect(downloadObjectUseCase.execute).toHaveBeenCalledWith(
      new DownloadObjectCommand('letterheads/org1/lh1/first-page.pdf'),
    );
    expect(downloadObjectUseCase.execute).toHaveBeenCalledWith(
      new DownloadObjectCommand('letterheads/org1/lh1/continuation.pdf'),
    );
    expect(documentExportPort.exportToPdf).toHaveBeenCalledWith(
      '<p>Meeting notes content</p>',
      expect.objectContaining({
        firstPagePdf: firstPageBuf,
        continuationPagePdf: contPageBuf,
        firstPageMargins: { top: 55, right: 15, bottom: 20, left: 15 },
        continuationPageMargins: { top: 20, right: 15, bottom: 20, left: 15 },
      }),
    );
  });

  it('should export PDF without letterhead when letterhead is not found', async () => {
    const artifact = createArtifact({ letterheadId: mockLetterheadId });
    const pdfBuffer = Buffer.from('fake-pdf');

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    findLetterheadUseCase.execute.mockRejectedValue(
      new LetterheadNotFoundError(mockLetterheadId),
    );
    documentExportPort.exportToPdf.mockResolvedValue(pdfBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    const result = await useCase.execute(command);

    expect(result.buffer).toBe(pdfBuffer);
    expect(documentExportPort.exportToPdf).toHaveBeenCalledWith(
      '<p>Meeting notes content</p>',
      undefined,
    );
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should gracefully degrade when letterhead PDF download fails', async () => {
    const artifact = createArtifact({ letterheadId: mockLetterheadId });
    const letterhead = createLetterhead();
    const pdfBuffer = Buffer.from('fake-pdf-no-letterhead');

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    findLetterheadUseCase.execute.mockResolvedValue(letterhead);
    downloadObjectUseCase.execute.mockRejectedValue(
      new Error('Object not found in storage'),
    );
    documentExportPort.exportToPdf.mockResolvedValue(pdfBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    const result = await useCase.execute(command);

    expect(result.buffer).toBe(pdfBuffer);
    expect(documentExportPort.exportToPdf).toHaveBeenCalledWith(
      '<p>Meeting notes content</p>',
      undefined,
    );
  });

  it('should export DOCX ignoring letterhead even when artifact has letterheadId', async () => {
    const artifact = createArtifact({ letterheadId: mockLetterheadId });
    const docxBuffer = Buffer.from('fake-docx');

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    documentExportPort.exportToDocx.mockResolvedValue(docxBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'docx',
    });

    const result = await useCase.execute(command);

    expect(result.buffer).toBe(docxBuffer);
    expect(findLetterheadUseCase.execute).not.toHaveBeenCalled();
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw ArtifactNotFoundError when artifact does not exist', async () => {
    artifactsRepository.findByIdWithVersions.mockResolvedValue(null);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ArtifactNotFoundError,
    );
  });

  it('should sanitize special characters from the file name', async () => {
    const artifact = createArtifact({ title: 'Report <2026> "Final"' });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    documentExportPort.exportToPdf.mockResolvedValue(
      Buffer.from('pdf-content'),
    );

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    const result = await useCase.execute(command);

    expect(result.fileName).toBe('Report 2026 Final.pdf');
    expect(result.fileName).not.toContain('<');
    expect(result.fileName).not.toContain('"');
  });

  it('should fallback to "artifact" when title has only non-ASCII characters', async () => {
    const artifact = createArtifact({ title: 'Бюджетний звіт' });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    documentExportPort.exportToPdf.mockResolvedValue(
      Buffer.from('pdf-content'),
    );

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    const result = await useCase.execute(command);

    expect(result.fileName).toBe('artifact.pdf');
  });

  it('should throw UnauthorizedAccessError when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportArtifactUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: DocumentExportPort, useValue: documentExportPort },
        { provide: ContextService, useValue: mockContextService },
        { provide: FindLetterheadUseCase, useValue: findLetterheadUseCase },
        { provide: DownloadObjectUseCase, useValue: downloadObjectUseCase },
      ],
    }).compile();

    const useCaseNoAuth = module.get<ExportArtifactUseCase>(
      ExportArtifactUseCase,
    );

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    await expect(useCaseNoAuth.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should export PDF with letterhead without continuation page when not set', async () => {
    const artifact = createArtifact({ letterheadId: mockLetterheadId });
    const letterhead = new Letterhead({
      id: mockLetterheadId,
      orgId: mockOrgId,
      name: 'Simple Letterhead',
      firstPageStoragePath: 'letterheads/org1/lh2/first-page.pdf',
      continuationPageStoragePath: null,
      firstPageMargins: { top: 40, right: 20, bottom: 20, left: 20 },
      continuationPageMargins: { top: 20, right: 20, bottom: 20, left: 20 },
    });
    const firstPageBuf = Buffer.from('%PDF-first-only');
    const pdfBuffer = Buffer.from('fake-pdf');

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    findLetterheadUseCase.execute.mockResolvedValue(letterhead);
    downloadObjectUseCase.execute.mockResolvedValueOnce(
      createBufferStream(firstPageBuf),
    );
    documentExportPort.exportToPdf.mockResolvedValue(pdfBuffer);

    const command = new ExportArtifactCommand({
      artifactId: mockArtifactId,
      format: 'pdf',
    });

    await useCase.execute(command);

    expect(downloadObjectUseCase.execute).toHaveBeenCalledTimes(1);
    expect(documentExportPort.exportToPdf).toHaveBeenCalledWith(
      '<p>Meeting notes content</p>',
      expect.objectContaining({
        firstPagePdf: firstPageBuf,
        continuationPagePdf: undefined,
      }),
    );
  });
});
