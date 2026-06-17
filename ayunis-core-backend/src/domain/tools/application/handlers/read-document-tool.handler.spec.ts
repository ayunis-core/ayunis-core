import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReadDocumentToolHandler } from './read-document-tool.handler';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { ReadDocumentTool } from '../../domain/tools/read-document-tool.entity';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ToolExecutionFailedError } from '../tools.errors';

describe('ReadDocumentToolHandler', () => {
  let handler: ReadDocumentToolHandler;
  let mockFindArtifactUseCase: jest.Mocked<FindArtifactWithVersionsUseCase>;

  const mockThreadId = randomUUID();
  const mockOrgId = randomUUID();
  const mockArtifactId = randomUUID();
  const mockUserId = randomUUID();

  beforeEach(async () => {
    mockFindArtifactUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindArtifactWithVersionsUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadDocumentToolHandler,
        {
          provide: FindArtifactWithVersionsUseCase,
          useValue: mockFindArtifactUseCase,
        },
      ],
    }).compile();

    handler = module.get<ReadDocumentToolHandler>(ReadDocumentToolHandler);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockArtifact(
    versionNumber: number,
    content: string,
  ): DocumentArtifact {
    const version = new ArtifactVersion({
      id: randomUUID(),
      artifactId: mockArtifactId,
      versionNumber,
      content,
      authorType: AuthorType.USER,
      authorId: mockUserId,
    });

    return new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Municipal Budget Report 2026',
      currentVersionNumber: versionNumber,
      versions: [version],
    });
  }

  it('should return document content with title and version number', async () => {
    const artifact = createMockArtifact(
      3,
      '<h1>Budget Report</h1><p>Total: €5.2M</p>',
    );
    mockFindArtifactUseCase.execute.mockResolvedValue(artifact);

    const tool = new ReadDocumentTool();
    const input = { artifact_id: mockArtifactId };

    const result = await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(result).toContain('Municipal Budget Report 2026');
    expect(result).toContain('version: 3');
    expect(result).toContain('<h1>Budget Report</h1><p>Total: €5.2M</p>');
  });

  it('should call FindArtifactWithVersionsUseCase with the correct artifact ID', async () => {
    const artifact = createMockArtifact(1, '<p>Content</p>');
    mockFindArtifactUseCase.execute.mockResolvedValue(artifact);

    const tool = new ReadDocumentTool();
    const input = { artifact_id: mockArtifactId };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(mockFindArtifactUseCase.execute).toHaveBeenCalledTimes(1);
    const query = mockFindArtifactUseCase.execute.mock.calls[0][0];
    expect(query.artifactId).toBe(mockArtifactId);
  });

  it('should throw ToolExecutionFailedError when use case fails', async () => {
    mockFindArtifactUseCase.execute.mockRejectedValue(
      new Error('DocumentArtifact not found'),
    );

    const tool = new ReadDocumentTool();
    const input = { artifact_id: mockArtifactId };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should throw ToolExecutionFailedError when input validation fails', async () => {
    const tool = new ReadDocumentTool();
    const input = {};

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });
});
