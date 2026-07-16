import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateSpreadsheetToolHandler } from './update-spreadsheet-tool.handler';
import { UpdateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/update-artifact/update-artifact.use-case';
import { UpdateSpreadsheetTool } from '../../domain/tools/update-spreadsheet-tool.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { SPREADSHEET_CONTENT_FORMAT } from 'src/domain/artifacts/application/helpers/spreadsheet-content';
import { ToolExecutionFailedError } from '../tools.errors';
import { ArtifactExpectedVersionMismatchError } from 'src/domain/artifacts/application/artifacts.errors';

describe('UpdateSpreadsheetToolHandler', () => {
  let handler: UpdateSpreadsheetToolHandler;
  let mockUpdateArtifactUseCase: jest.Mocked<UpdateArtifactUseCase>;

  const mockThreadId = randomUUID();
  const mockOrgId = randomUUID();
  const mockArtifactId = randomUUID();

  const validInput = {
    artifact_id: mockArtifactId,
    columns: ['Item', 'Amount'],
    rows: [['Rent', 1300]],
    expected_version: 1,
  };

  beforeEach(async () => {
    mockUpdateArtifactUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateArtifactUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSpreadsheetToolHandler,
        {
          provide: UpdateArtifactUseCase,
          useValue: mockUpdateArtifactUseCase,
        },
      ],
    }).compile();

    handler = module.get<UpdateSpreadsheetToolHandler>(
      UpdateSpreadsheetToolHandler,
    );

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
      content: JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['Item', 'Amount'],
        rows: [['Rent', 1300]],
      }),
      authorType: AuthorType.ASSISTANT,
      authorId: null,
    });
  }

  it('should call UpdateArtifactUseCase with serialized content and expected version', async () => {
    mockUpdateArtifactUseCase.execute.mockResolvedValue(createMockVersion());

    const tool = new UpdateSpreadsheetTool();

    await handler.execute({
      tool,
      input: validInput,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(mockUpdateArtifactUseCase.execute).toHaveBeenCalledTimes(1);
    const command = mockUpdateArtifactUseCase.execute.mock.calls[0][0];
    expect(command.artifactId).toBe(mockArtifactId);
    expect(command.authorType).toBe(AuthorType.ASSISTANT);
    expect(command.expectedVersionNumber).toBe(1);
    expect(JSON.parse(command.content!)).toEqual({
      format: SPREADSHEET_CONTENT_FORMAT,
      columns: ['Item', 'Amount'],
      rows: [['Rent', 1300]],
    });
  });

  it('should return a success message containing the artifact ID and version number', async () => {
    mockUpdateArtifactUseCase.execute.mockResolvedValue(createMockVersion());

    const tool = new UpdateSpreadsheetTool();

    const result = await handler.execute({
      tool,
      input: validInput,
      context: { threadId: mockThreadId, orgId: mockOrgId },
    });

    expect(result).toContain('Spreadsheet updated successfully');
    expect(result).toContain(mockArtifactId);
    expect(result).toContain('version: 2');
  });

  it('should throw ToolExecutionFailedError with exposeToLLM when version mismatch occurs', async () => {
    mockUpdateArtifactUseCase.execute.mockRejectedValue(
      new ArtifactExpectedVersionMismatchError(mockArtifactId, 1, 3),
    );

    const tool = new UpdateSpreadsheetTool();

    try {
      await handler.execute({
        tool,
        input: validInput,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      });
      fail('expected ToolExecutionFailedError');
    } catch (error) {
      expect(error).toBeInstanceOf(ToolExecutionFailedError);
      expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((error as ToolExecutionFailedError).message).toContain(
        'Version conflict',
      );
    }
  });

  it('should throw ToolExecutionFailedError when expected_version is missing', async () => {
    const tool = new UpdateSpreadsheetTool();
    const inputWithoutVersion = {
      artifact_id: mockArtifactId,
      columns: ['Item', 'Amount'],
      rows: [['Rent', 1300]],
    };

    await expect(
      handler.execute({
        tool,
        input: inputWithoutVersion,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
    expect(mockUpdateArtifactUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw ToolExecutionFailedError when the use case fails', async () => {
    mockUpdateArtifactUseCase.execute.mockRejectedValue(
      new Error('Artifact not found'),
    );

    const tool = new UpdateSpreadsheetTool();

    await expect(
      handler.execute({
        tool,
        input: validInput,
        context: { threadId: mockThreadId, orgId: mockOrgId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });
});
