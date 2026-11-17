import { randomUUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import type { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import type { ExecuteMcpToolCommand } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.command';
import type { ResolveThreadFileUseCase } from 'src/domain/threads/application/use-cases/resolve-thread-file/resolve-thread-file.use-case';
import type { ResolveThreadFileQuery } from 'src/domain/threads/application/use-cases/resolve-thread-file/resolve-thread-file.query';
import {
  ThreadFileAddedBySkillError,
  ThreadFileNotFoundError,
  ThreadFileNotStoredError,
} from 'src/domain/threads/application/threads.errors';
import type { ThreadFileObject } from 'src/domain/threads/application/models/thread-file-object';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { McpFileHandoverService } from 'src/domain/tools/application/services/mcp-file-handover.service';
import { McpIntegrationToolHandler } from './mcp-integration-tool.handler';

const FILE_OBJECT_SCHEMA = {
  type: 'object',
  properties: {
    download_url: { type: 'string' },
    file_id: { type: 'string' },
    mime_type: { type: 'string' },
    file_name: { type: 'string' },
  },
  required: ['download_url', 'file_id'],
};

const startPdfTool = new McpIntegrationTool(
  new McpTool(
    'start_pdf_file',
    'Makes a PDF accessible',
    {
      type: 'object',
      properties: {
        file: FILE_OBJECT_SCHEMA,
        attachments: { type: 'array', items: FILE_OBJECT_SCHEMA },
        language: { type: 'string' },
      },
      required: ['file'],
    },
    randomUUID(),
    ['file', 'attachments'],
  ),
  false,
  'Accessful',
  null,
);

function fileObject(sourceId: string): ThreadFileObject {
  return {
    download_url: `https://storage.example.com/sources/${sourceId}.pdf?X-Amz-Signature=secret-${sourceId}`,
    file_id: sourceId,
    mime_type: 'application/pdf',
    file_name: `${sourceId}.pdf`,
  };
}

describe('McpIntegrationToolHandler', () => {
  const threadId = randomUUID();
  let executeMcpTool: jest.Mock<Promise<unknown>, [ExecuteMcpToolCommand]>;
  let resolveThreadFile: jest.Mock<
    Promise<ThreadFileObject>,
    [ResolveThreadFileQuery]
  >;
  let handler: McpIntegrationToolHandler;

  beforeEach(() => {
    createLoggerMock();
    executeMcpTool = jest.fn().mockResolvedValue({
      isError: false,
      content: [{ type: 'text', text: 'Job started' }],
    });
    resolveThreadFile = jest.fn((query: ResolveThreadFileQuery) =>
      Promise.resolve(fileObject(query.sourceId)),
    );
    handler = new McpIntegrationToolHandler(
      { execute: executeMcpTool } as unknown as ExecuteMcpToolUseCase,
      new McpFileHandoverService({
        execute: resolveThreadFile,
      } as unknown as ResolveThreadFileUseCase),
    );
  });

  function run(input: Record<string, unknown>, isAnonymous = false) {
    return handler.execute({
      tool: startPdfTool,
      input,
      context: { orgId: randomUUID(), threadId, isAnonymous },
    });
  }

  function sentArguments(): Record<string, unknown> {
    return executeMcpTool.mock.calls[0][0].parameters;
  }

  it('sends the server file objects for the chat files the model named, and leaves omitted fields omitted', async () => {
    const input = { file: 'source-a', language: 'de' };

    await run(input);

    expect(sentArguments()).toEqual({
      file: fileObject('source-a'),
      language: 'de',
    });
    expect(resolveThreadFile.mock.calls[0][0]).toEqual({
      threadId,
      sourceId: 'source-a',
    });
  });

  it('keeps the source IDs in the input the run persists', async () => {
    const input = { file: 'source-a', attachments: ['source-b'] };

    await run(input);

    expect(input).toEqual({ file: 'source-a', attachments: ['source-b'] });
  });

  it('converts every item of a list field', async () => {
    await run({ file: 'source-a', attachments: ['source-b', 'source-c'] });

    expect(sentArguments().attachments).toEqual([
      fileObject('source-b'),
      fileObject('source-c'),
    ]);
  });

  it('refuses file handover in an anonymous chat without calling the server', async () => {
    await expect(run({ file: 'source-a' }, true)).rejects.toThrow(
      /not available in anonymous mode/,
    );

    expect(resolveThreadFile).not.toHaveBeenCalled();
    expect(executeMcpTool).not.toHaveBeenCalled();
  });

  it.each([
    ['not a file of this chat', new ThreadFileNotFoundError('source-x')],
    ['added by a skill', new ThreadFileAddedBySkillError('source-x')],
    ['has no stored original', new ThreadFileNotStoredError('source-x')],
  ])(
    'tells the model the file is %s and never calls the server',
    async (rule, error) => {
      resolveThreadFile.mockImplementation((query) =>
        query.sourceId === 'source-x'
          ? Promise.reject(error)
          : Promise.resolve(fileObject(query.sourceId)),
      );

      const call = run({ file: 'source-a', attachments: ['source-x'] });

      await expect(call).rejects.toThrow(ToolExecutionFailedError);
      await expect(call).rejects.toMatchObject({
        exposeToLLM: true,
        message: expect.stringContaining(rule) as string,
      });
      expect(executeMcpTool).not.toHaveBeenCalled();
    },
  );

  it('refuses a file field that is not a source ID even when the server schema cannot be validated', async () => {
    const draft04Tool = new McpIntegrationTool(
      new McpTool(
        'start_pdf_file',
        'Makes a PDF accessible',
        {
          type: 'object',
          properties: {
            file: FILE_OBJECT_SCHEMA,
            pages: { type: 'integer', minimum: 0, exclusiveMinimum: true },
          },
        },
        randomUUID(),
        ['file'],
      ),
      false,
      'Accessful',
      null,
    );

    await expect(
      handler.execute({
        tool: draft04Tool,
        input: { file: { download_url: 'https://attacker.example/x.pdf' } },
        context: { orgId: randomUUID(), threadId },
      }),
    ).rejects.toThrow(/must contain IDs of files attached to this chat/);

    expect(resolveThreadFile).not.toHaveBeenCalled();
    expect(executeMcpTool).not.toHaveBeenCalled();
  });

  it('removes a download URL the server echoes from the result the model and chat see', async () => {
    const url = fileObject('source-a').download_url;
    executeMcpTool.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: `Could not download ${url}` }],
    });

    const result = await run({ file: 'source-a' });

    expect(result).not.toContain('X-Amz-Signature');
    expect(result).toContain('source-a');
  });
});
