import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateDocumentToolHandler } from './update-document-tool.handler';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateDocumentTool } from '../../domain/tools/update-document-tool.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ToolExecutionFailedError } from '../tools.errors';
import { ArtifactExpectedVersionMismatchError } from 'src/domain/artifacts/application/artifacts.errors';

describe('UpdateDocumentToolHandler', () => {
  let handler: UpdateDocumentToolHandler;
  let mockUpdateArtifactUseCase: jest.Mocked<UpdateArtifactUseCase>;

  const mockThreadId = randomUUID();
  const mockOrgId = randomUUID();
  const mockArtifactId = randomUUID();

  beforeEach(async () => {
    mockUpdateArtifactUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateDocumentToolHandler,
        {
          provide: UpdateArtifactUseCase,
          useValue: mockUpdateArtifactUseCase,
        },
      ],
    }).compile();

    handler = module.get<UpdateDocumentToolHandler>(UpdateDocumentToolHandler);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockVersion(): ArtifactVersion {
    return new ArtifactVersion({
      id: randomUUID(),
      artifactId: mockArtifactId,
      versionNumber: 2,
      content: '<h1>Updated Budget Report</h1><p>Revised figures</p>',
      authorType: AuthorType.ASSISTANT,
      authorId: null,
    });
  }

  it('should call UpdateArtifactUseCase with correct artifactId, content, authorType, and expectedVersionNumber', async () => {
    const version = createMockVersion();
    mockUpdateArtifactUseCase.execute.mockResolvedValue(version);

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Updated Budget Report</h1><p>Revised figures</p>',
      expected_version: 1,
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(mockUpdateArtifactUseCase.execute).toHaveBeenCalledTimes(1);
    const command = mockUpdateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.artifactId).toBe(mockArtifactId);
    expect(command.content).toBe(
      '<h1>Updated Budget Report</h1><p>Revised figures</p>',
    );
    expect(command.authorType).toBe(AuthorType.ASSISTANT);
    expect(command.expectedVersionNumber).toBe(1);
  });

  it('should return a success message containing the artifact ID and version number', async () => {
    const version = createMockVersion();
    mockUpdateArtifactUseCase.execute.mockResolvedValue(version);

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Updated Report</h1>',
      expected_version: 1,
    };

    const result = await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(result).toContain(mockArtifactId);
    expect(result).toContain('Document updated successfully');
    expect(result).toContain('version: 2');
  });

  it('should pass letterheadId to UpdateArtifactCommand when letterhead_id is provided', async () => {
    const version = createMockVersion();
    mockUpdateArtifactUseCase.execute.mockResolvedValue(version);

    const letterheadId = randomUUID();
    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Updated with letterhead</h1>',
      expected_version: 1,
      letterhead_id: letterheadId,
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    const command = mockUpdateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.letterheadId).toBe(letterheadId);
  });

  it('should not pass letterheadId when letterhead_id is not provided', async () => {
    const version = createMockVersion();
    mockUpdateArtifactUseCase.execute.mockResolvedValue(version);

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Updated without letterhead</h1>',
      expected_version: 1,
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    const command = mockUpdateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.letterheadId).toBeUndefined();
  });

  it('should throw ToolExecutionFailedError when UpdateArtifactUseCase fails', async () => {
    mockUpdateArtifactUseCase.execute.mockRejectedValue(
      new Error('Artifact not found'),
    );

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Will Fail</h1>',
      expected_version: 1,
    };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should throw ToolExecutionFailedError with exposeToLLM when version mismatch occurs', async () => {
    mockUpdateArtifactUseCase.execute.mockRejectedValue(
      new ArtifactExpectedVersionMismatchError(mockArtifactId, 1, 3),
    );

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Stale Update</h1>',
      expected_version: 1,
    };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);

    try {
      await handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ToolExecutionFailedError);
      expect((error as ToolExecutionFailedError).message).toContain(
        'read_document',
      );
    }
  });

  it('should throw ToolExecutionFailedError when input validation fails', async () => {
    const tool = new UpdateDocumentTool();
    const input = {
      // artifact_id is missing
      content: '<h1>Missing Artifact ID</h1>',
    };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });
});
