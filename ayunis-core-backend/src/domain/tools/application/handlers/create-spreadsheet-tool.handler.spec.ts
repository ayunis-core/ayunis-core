import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { CreateSpreadsheetToolHandler } from './create-spreadsheet-tool.handler';
import { CreateArtifactUseCase } from 'src/domain/artifacts/application/use-cases/create-artifact/create-artifact.use-case';
import { CreateSpreadsheetTool } from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { SpreadsheetArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { SPREADSHEET_CONTENT_FORMAT } from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { GetThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

describe('CreateSpreadsheetToolHandler', () => {
  let handler: CreateSpreadsheetToolHandler;
  let mockCreateArtifactUseCase: jest.Mocked<CreateArtifactUseCase>;
  let mockGetThreadSourcesUseCase: jest.Mocked<GetThreadSourcesUseCase>;

  const mockThreadId = randomUUID();
  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockArtifactId = randomUUID();

  beforeEach(async () => {
    mockCreateArtifactUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateArtifactUseCase>;
    mockGetThreadSourcesUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetThreadSourcesUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSpreadsheetToolHandler,
        {
          provide: CreateArtifactUseCase,
          useValue: mockCreateArtifactUseCase,
        },
        {
          provide: GetThreadSourcesUseCase,
          useValue: mockGetThreadSourcesUseCase,
        },
      ],
    }).compile();

    handler = module.get<CreateSpreadsheetToolHandler>(
      CreateSpreadsheetToolHandler,
    );
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
    ).rejects.toThrow('Provide either data_source_id, or columns and rows.');
    expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    [{ columns: ['A'] }, 'rows is missing'],
    [{ rows: [['x']] }, 'columns is missing'],
  ])(
    'names the missing inline input when only half of it is given',
    async (partial, message) => {
      await expect(
        handler.execute({
          tool: new CreateSpreadsheetTool(),
          input: { title: 'Half', ...partial },
          context: { threadId: mockThreadId, orgId: mockOrgId },
        }),
      ).rejects.toThrow(message);
      expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
    },
  );

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

  describe('data_source_id import', () => {
    function createCsvSource(status = SourceStatus.READY): CSVDataSource {
      return new CSVDataSource({
        id: randomUUID(),
        name: 'bookings',
        status,
        data: {
          headers: ['Booking date', 'Amount', 'Batch', 'Reference'],
          rows: [
            ['2026-01-02', '12.50', '007', 'Rent Müller'],
            ['2026-01-03', '-3', '0', ''],
            ['03.01.2026', '72,25', '1,234', '1234567890123456'],
          ],
        },
      });
    }

    it('creates the spreadsheet from every row of an available CSV source', async () => {
      const source = createCsvSource();
      mockGetThreadSourcesUseCase.execute.mockResolvedValue([source]);
      mockCreateArtifactUseCase.execute.mockResolvedValue(createMockArtifact());

      const result = await handler.execute({
        tool: new CreateSpreadsheetTool(),
        input: { title: 'Bookings', data_source_id: source.id },
        context: { threadId: mockThreadId, orgId: mockOrgId },
      });

      const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
      expect(JSON.parse(command.content)).toEqual({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['Booking date', 'Amount', 'Batch', 'Reference'],
        rows: [
          ['2026-01-02', 12.5, '007', 'Rent Müller'],
          ['2026-01-03', -3, 0, null],
          ['03.01.2026', 72.25, '1,234', '1234567890123456'],
        ],
      });
      expect(result).toContain('3 rows');
    });

    it('converts German thousands-grouped amounts and keeps malformed groups as text', async () => {
      const values = [
        '1.234,56',
        '-1.000,00',
        '12.345.678,9',
        '1.23,45',
        '01.234,56',
        '1234.567,89',
        '1.234,567',
      ];
      const source = new CSVDataSource({
        id: randomUUID(),
        name: 'grouped',
        data: { headers: ['Betrag'], rows: values.map((value) => [value]) },
      });
      mockGetThreadSourcesUseCase.execute.mockResolvedValue([source]);
      mockCreateArtifactUseCase.execute.mockResolvedValue(createMockArtifact());

      await handler.execute({
        tool: new CreateSpreadsheetTool(),
        input: { title: 'Grouped', data_source_id: source.id },
        context: { threadId: mockThreadId, orgId: mockOrgId },
      });

      const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
      expect(JSON.parse(command.content).rows).toEqual([
        [1234.56],
        [-1000],
        [12345678.9],
        ['1.23,45'],
        ['01.234,56'],
        ['1234.567,89'],
        ['1.234,567'],
      ]);
    });

    it('keeps numeric strings as text when a number cannot hold them exactly', async () => {
      const values = [
        '999999999999999',
        '999999999999999.99',
        '99999999999999.9',
        '0.123456789012345',
        '0.1234567890123456',
        '100000000000000.000',
        '-0.000000000000001',
        '12345678901234,5',
      ];
      const source = new CSVDataSource({
        id: randomUUID(),
        name: 'precision',
        data: { headers: ['Value'], rows: values.map((value) => [value]) },
      });
      mockGetThreadSourcesUseCase.execute.mockResolvedValue([source]);
      mockCreateArtifactUseCase.execute.mockResolvedValue(createMockArtifact());

      await handler.execute({
        tool: new CreateSpreadsheetTool(),
        input: { title: 'Precision', data_source_id: source.id },
        context: { threadId: mockThreadId, orgId: mockOrgId },
      });

      const command = mockCreateArtifactUseCase.execute.mock.calls[0][0];
      expect(JSON.parse(command.content).rows).toEqual([
        [999999999999999],
        ['999999999999999.99'],
        [99999999999999.9],
        [0.123456789012345],
        ['0.1234567890123456'],
        [100000000000000],
        [-0.000000000000001],
        [12345678901234.5],
      ]);
    });

    it('rejects a data source that is not attached to this thread', async () => {
      mockGetThreadSourcesUseCase.execute.mockResolvedValue([
        createCsvSource(),
      ]);
      const tool = new CreateSpreadsheetTool();

      await expect(
        handler.execute({
          tool,
          input: { title: 'Bookings', data_source_id: randomUUID() },
          context: { threadId: mockThreadId, orgId: mockOrgId },
        }),
      ).rejects.toThrow('not attached to this conversation');
      expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
    });

    it('rejects a data source that is not ready', async () => {
      const source = createCsvSource(SourceStatus.PROCESSING);
      mockGetThreadSourcesUseCase.execute.mockResolvedValue([source]);

      await expect(
        handler.execute({
          tool: new CreateSpreadsheetTool(),
          input: { title: 'Bookings', data_source_id: source.id },
          context: { threadId: mockThreadId, orgId: mockOrgId },
        }),
      ).rejects.toThrow('still processing');
      expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
    });

    it('rejects combining data_source_id with inline rows', async () => {
      const source = createCsvSource();

      await expect(
        handler.execute({
          tool: new CreateSpreadsheetTool(),
          input: {
            title: 'Bookings',
            data_source_id: source.id,
            columns: ['A'],
            rows: [['x']],
          },
          context: { threadId: mockThreadId, orgId: mockOrgId },
        }),
      ).rejects.toThrow('not both');
      expect(mockCreateArtifactUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
