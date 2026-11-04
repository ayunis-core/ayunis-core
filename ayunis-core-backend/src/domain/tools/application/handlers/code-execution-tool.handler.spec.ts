import { randomUUID } from 'crypto';
import { CodeExecutionToolHandler } from './code-execution-tool.handler';
import { CodeExecutionTool } from 'src/domain/tools/domain/tools/code-execution-tool.entity';
import type { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import type { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { AuthorizedCsvSourceResolverService } from 'src/domain/tools/application/services/authorized-csv-source-resolver.service';
import type { GetThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.use-case';

const mockExecuteCode = jest.fn();

jest.mock(
  'src/common/clients/code-execution/generated/ayunisCodeExecutionService',
  () => ({
    getAyunisCodeExecutionService: () => ({
      executeCodeExecutePost: mockExecuteCode,
    }),
  }),
);

describe('CodeExecutionToolHandler', () => {
  let handler: CodeExecutionToolHandler;
  let getThreadSourcesUseCase: jest.Mocked<GetThreadSourcesUseCase>;

  beforeEach(() => {
    getThreadSourcesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetThreadSourcesUseCase>;
    handler = new CodeExecutionToolHandler(
      new AuthorizedCsvSourceResolverService(getThreadSourcesUseCase),
      { execute: jest.fn() } as unknown as CreateDataSourceUseCase,
      { execute: jest.fn() } as unknown as AddSourceToThreadUseCase,
      { execute: jest.fn() } as unknown as FindThreadUseCase,
    );
    mockExecuteCode.mockResolvedValue({
      success: true,
      output: 'PRIVATE_SENTINEL',
      exit_code: 0,
      execution_id: randomUUID(),
      output_files: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a READY CSV that is not attached to the current thread before execution', async () => {
    const unrelatedSource = new CSVDataSource({
      id: randomUUID(),
      name: 'private-payroll',
      status: SourceStatus.READY,
      data: {
        headers: ['employee', 'salary'],
        rows: [['PRIVATE_SENTINEL', '95000']],
      },
    });
    getThreadSourcesUseCase.execute.mockResolvedValue([]);

    await expect(
      handler.execute({
        tool: new CodeExecutionTool([]),
        input: {
          code: "print(open('/execution/files/source.csv').read())",
          dataSourceIds: [unrelatedSource.id],
        },
        context: { threadId: randomUUID(), orgId: randomUUID() },
      }),
    ).rejects.toMatchObject({
      message: `Failed to execute tool code_execution: Data source ${unrelatedSource.id} is not attached to this conversation.`,
      exposeToLLM: true,
    });
    expect(mockExecuteCode).not.toHaveBeenCalled();
  });

  it('executes without resolving thread sources when no CSV was requested', async () => {
    getThreadSourcesUseCase.execute.mockRejectedValue(
      new Error('thread source lookup should not run'),
    );

    const result = await handler.execute({
      tool: new CodeExecutionTool([]),
      input: { code: "print('ready')", dataSourceIds: [] },
      context: { threadId: randomUUID(), orgId: randomUUID() },
    });

    expect(result).toContain('Code executed successfully');
    expect(mockExecuteCode).toHaveBeenCalledWith({
      code: "print('ready')",
      files: {},
    });
  });

  it('sends an attached newly generated READY CSV to execution', async () => {
    const generatedSource = new CSVDataSource({
      id: randomUUID(),
      name: 'calculated-budget',
      status: SourceStatus.READY,
      createdBy: SourceCreator.LLM,
      data: {
        headers: ['department', 'amount'],
        rows: [['Library', '120000']],
      },
    });
    getThreadSourcesUseCase.execute.mockResolvedValue([generatedSource]);

    await handler.execute({
      tool: new CodeExecutionTool([generatedSource]),
      input: {
        code: "print(open('/execution/files/source.csv').read())",
        dataSourceIds: [generatedSource.id],
      },
      context: { threadId: randomUUID(), orgId: randomUUID() },
    });

    const request = mockExecuteCode.mock.calls[0][0];
    const encodedCsv = request.files[`${generatedSource.id}.csv`];
    expect(Buffer.from(encodedCsv, 'base64').toString('utf-8')).toContain(
      '"Library","120000"',
    );
  });

  it('rejects a mixed attached and unattached list before execution', async () => {
    const attachedSource = new CSVDataSource({
      id: randomUUID(),
      name: 'public-budget',
      status: SourceStatus.READY,
      data: { headers: ['department'], rows: [['Library']] },
    });
    getThreadSourcesUseCase.execute.mockResolvedValue([attachedSource]);

    await expect(
      handler.execute({
        tool: new CodeExecutionTool([attachedSource]),
        input: {
          code: "print('budgets')",
          dataSourceIds: [attachedSource.id, randomUUID()],
        },
        context: { threadId: randomUUID(), orgId: randomUUID() },
      }),
    ).rejects.toThrow('not attached to this conversation');
    expect(mockExecuteCode).not.toHaveBeenCalled();
  });

  it.each([
    [SourceStatus.PROCESSING, 'still processing'],
    [SourceStatus.FAILED, 'failed to process'],
  ])('rejects an attached %s CSV before execution', async (status, message) => {
    const source = new CSVDataSource({
      id: randomUUID(),
      name: 'pending-budget',
      status,
      data: { headers: ['department'], rows: [['Library']] },
    });
    getThreadSourcesUseCase.execute.mockResolvedValue([source]);

    await expect(
      handler.execute({
        tool: new CodeExecutionTool([source]),
        input: { code: "print('budget')", dataSourceIds: [source.id] },
        context: { threadId: randomUUID(), orgId: randomUUID() },
      }),
    ).rejects.toThrow(message);
    expect(mockExecuteCode).not.toHaveBeenCalled();
  });
});
