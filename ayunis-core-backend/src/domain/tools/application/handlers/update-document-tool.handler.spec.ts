import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateDocumentToolHandler } from './update-document-tool.handler';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateDocumentTool } from '../../domain/tools/update-document-tool.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ToolExecutionFailedError } from '../tools.errors';

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

  it('should call UpdateArtifactUseCase with correct artifactId, content, and authorType', async () => {
    const version = createMockVersion();
    mockUpdateArtifactUseCase.execute.mockResolvedValue(version);

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Updated Budget Report</h1><p>Revised figures</p>',
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
  });

  it('should return a success message containing the artifact ID', async () => {
    const version = createMockVersion();
    mockUpdateArtifactUseCase.execute.mockResolvedValue(version);

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Updated Report</h1>',
    };

    const result = await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(result).toContain(mockArtifactId);
    expect(result).toContain('Document updated successfully');
  });

  it('should throw ToolExecutionFailedError when UpdateArtifactUseCase fails', async () => {
    mockUpdateArtifactUseCase.execute.mockRejectedValue(
      new Error('Artifact not found'),
    );

    const tool = new UpdateDocumentTool();
    const input = {
      artifact_id: mockArtifactId,
      content: '<h1>Will Fail</h1>',
    };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
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
