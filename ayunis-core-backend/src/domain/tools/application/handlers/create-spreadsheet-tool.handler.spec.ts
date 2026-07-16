import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateSpreadsheetToolHandler } from './create-spreadsheet-tool.handler';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateSpreadsheetTool } from '../../domain/tools/create-spreadsheet-tool.entity';
import { SpreadsheetArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { SPREADSHEET_CONTENT_FORMAT } from 'src/domain/artifacts/application/helpers/spreadsheet-content';
import { ToolExecutionFailedError } from '../tools.errors';

describe('CreateSpreadsheetToolHandler', () => {
  let handler: CreateSpreadsheetToolHandler;
  let mockCreateArtifactUseCase: jest.Mocked<CreateArtifactUseCase>;

  const mockThreadId = randomUUID();
  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockArtifactId = randomUUID();

  beforeEach(async () => {
    mockCreateArtifactUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateArtifactUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSpreadsheetToolHandler,
        {
          provide: CreateArtifactUseCase,
          useValue: mockCreateArtifactUseCase,
        },
      ],
    }).compile();

    handler = module.get<CreateSpreadsheetToolHandler>(
      CreateSpreadsheetToolHandler,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockArtifact(): SpreadsheetArtifact {
    return new SpreadsheetArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Budget 2026',
      currentVersionNumber: 1,
    });
  }

  it('should call CreateArtifactUseCase with serialized spreadsheet content', async () => {
    mockCreateArtifactUseCase.execute.mockResolvedValue(createMockArtifact());

    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Budget 2026',
      columns: ['Item', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['Food', null],
      ],
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(mockCreateArtifactUseCase.execute).toHaveBeenCalledTimes(1);
    const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.threadId).toBe(mockThreadId);
    expect(command.type).toBe(ArtifactType.SPREADSHEET);
    expect(command.title).toBe('Budget 2026');
    expect(command.authorType).toBe(AuthorType.ASSISTANT);
    expect(JSON.parse(command.content)).toEqual({
      format: SPREADSHEET_CONTENT_FORMAT,
      columns: ['Item', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['Food', null],
      ],
    });
  });

  it('should pass formula cells through serialization unchanged', async () => {
    mockCreateArtifactUseCase.execute.mockResolvedValue(createMockArtifact());

    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Budget with Total',
      columns: ['Item', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['Total', '=SUM(B2:B2)'],
      ],
    };

    await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
    expect(JSON.parse(command.content).rows[1][1]).toBe('=SUM(B2:B2)');
  });

  it('should return a success message containing the artifact ID and version number', async () => {
    mockCreateArtifactUseCase.execute.mockResolvedValue(createMockArtifact());

    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Budget 2026',
      columns: ['Item'],
      rows: [['Rent']],
    };

    const result = await handler.execute({
      tool,
      input,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(result).toContain('Spreadsheet created successfully');
    expect(result).toContain(mockArtifactId);
    expect(result).toContain('version: 1');
  });

  it('should throw ToolExecutionFailedError when input validation fails', async () => {
    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Missing columns and rows',
    };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
    expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw ToolExecutionFailedError when a cell has an invalid type', async () => {
    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Bad Cells',
      columns: ['A'],
      rows: [[{ nested: true }]],
    };

    await expect(
      handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
    expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw ToolExecutionFailedError with exposeToLLM when the use case fails', async () => {
    mockCreateArtifactUseCase.execute.mockRejectedValue(
      new Error('Thread not found'),
    );

    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Will Fail',
      columns: ['A'],
      rows: [['x']],
    };

    try {
      await handler.execute({
        tool,
        input,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      });
      fail('expected ToolExecutionFailedError');
    } catch (error) {
      expect(error).toBeInstanceOf(ToolExecutionFailedError);
      expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
    }
  });
});
