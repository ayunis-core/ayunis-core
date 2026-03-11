import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
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

describe('ExportArtifactUseCase', () => {
  let useCase: ExportArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let documentExportPort: jest.Mocked<DocumentExportPort>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockArtifactId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

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
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: DocumentExportPort, useValue: mockExportPort },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ExportArtifactUseCase>(ExportArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);
    documentExportPort = module.get(DocumentExportPort);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('should export the current version as PDF', async () => {
    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Council Meeting Notes',
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
    );
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
    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Report <2026> "Final"',
      currentVersionNumber: 1,
      versions: [
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 1,
          content: '<p>Content</p>',
          authorType: AuthorType.ASSISTANT,
        }),
      ],
    });

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
    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Бюджетний звіт',
      currentVersionNumber: 1,
      versions: [
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 1,
          content: '<p>Зміст</p>',
          authorType: AuthorType.ASSISTANT,
        }),
      ],
    });

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

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportArtifactUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: DocumentExportPort, useValue: documentExportPort },
        { provide: ContextService, useValue: mockContextService },
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
      UnauthorizedException,
    );
  });
});
