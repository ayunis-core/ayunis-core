import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateDocumentToolHandler } from './create-document-tool.handler';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateDocumentTool } from '../../domain/tools/create-document-tool.entity';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ToolExecutionFailedError } from '../tools.errors';

describe('CreateDocumentToolHandler', () => {
  let handler: CreateDocumentToolHandler;
  let mockCreateArtifactUseCase: jest.Mocked<CreateArtifactUseCase>;

  const mockThreadId = randomUUID();
  const mockOrgId = randomUUID();
  const mockArtifactId = randomUUID();

  beforeEach(async () => {
    mockCreateArtifactUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDocumentToolHandler,
        {
          provide: CreateArtifactUseCase,
          useValue: mockCreateArtifactUseCase,
        },
      ],
    }).compile();

    handler = module.get<CreateDocumentToolHandler>(CreateDocumentToolHandler);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockArtifact(): DocumentArtifact {
    return new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: randomUUID(),
      title: 'Municipal Budget Report 2026',
      currentVersionNumber: 1,
    });
  }

  it('should call CreateArtifactUseCase with correct threadId, title, content, and authorType', async () => {
    const artifact = createMockArtifact();
    mockCreateArtifactUseCase.execute.mockResolvedValue(artifact);

    const tool = new CreateDocumentTool();
    const input = {
      title: 'Municipal Budget Report 2026',
      content: '<h1>Budget Report</h1><p>Total expenditure: €5.2M</p>',
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(mockCreateArtifactUseCase.execute).toHaveBeenCalledTimes(1);
    const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.threadId).toBe(mockThreadId);
    expect(command.title).toBe('Municipal Budget Report 2026');
    expect(command.content).toBe(
      '<h1>Budget Report</h1><p>Total expenditure: €5.2M</p>',
    );
    expect(command.authorType).toBe(AuthorType.ASSISTANT);
  });

  it('should return a success message containing the new artifact ID', async () => {
    const artifact = createMockArtifact();
    mockCreateArtifactUseCase.execute.mockResolvedValue(artifact);

    const tool = new CreateDocumentTool();
    const input = {
      title: 'Municipal Budget Report 2026',
      content: '<h1>Budget Report</h1>',
    };

    const result = await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(result).toContain(mockArtifactId);
    expect(result).toContain('Document created successfully');
    expect(result).toContain('version: 1');
  });

  it('should pass letterheadId to CreateArtifactCommand when letterhead_id is provided', async () => {
    const artifact = createMockArtifact();
    mockCreateArtifactUseCase.execute.mockResolvedValue(artifact);

    const letterheadId = randomUUID();
    const tool = new CreateDocumentTool();
    const input = {
      title: 'Official Letter',
      content: '<h1>Dear Sir</h1><p>Body</p>',
      letterhead_id: letterheadId,
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.letterheadId).toBe(letterheadId);
  });

  it('should not pass letterheadId when letterhead_id is not provided', async () => {
    const artifact = createMockArtifact();
    mockCreateArtifactUseCase.execute.mockResolvedValue(artifact);

    const tool = new CreateDocumentTool();
    const input = {
      title: 'Simple Note',
      content: '<p>No letterhead</p>',
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.letterheadId).toBeUndefined();
  });

  it('should throw ToolExecutionFailedError when CreateArtifactUseCase fails', async () => {
    mockCreateArtifactUseCase.execute.mockRejectedValue(
      new Error('Database connection lost'),
    );

    const tool = new CreateDocumentTool();
    const input = {
      title: 'Zoning Compliance Report',
      content: '<h1>Zoning</h1><p>Overview of zoning regulations</p>',
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
    const tool = new CreateDocumentTool();
    const input = {
      title: 'Missing Content Field',
      // content is missing
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
