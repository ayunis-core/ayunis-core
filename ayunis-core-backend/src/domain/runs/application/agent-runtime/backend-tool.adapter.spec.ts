import { RunContext, type ToolExecutionContext } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import type { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import type { CheckToolCapabilitiesUseCase } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import type { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { BackendToolAdapter } from './backend-tool.adapter';

const orgId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

function fakeTool(name: string): BackendTool {
  return {
    name,
    description: 'a tool',
    parameters: { type: 'object' },
  } as unknown as BackendTool;
}

function toolCtx(): ToolExecutionContext {
  return {
    context: RunContext.create({ orgId, threadId, isAnonymous: false }),
    toolCallId: 'c1',
  } as unknown as ToolExecutionContext;
}

describe('BackendToolAdapter', () => {
  let execute: jest.Mock;
  let checkExecute: jest.Mock;
  let anonymize: jest.Mock;
  let adapter: BackendToolAdapter;

  beforeEach(() => {
    execute = jest.fn();
    checkExecute = jest.fn();
    anonymize = jest.fn();
    adapter = new BackendToolAdapter(
      { execute } as unknown as ExecuteToolUseCase,
      { execute: checkExecute } as unknown as CheckToolCapabilitiesUseCase,
      { execute: anonymize } as unknown as AnonymizeTextForThreadUseCase,
    );
  });

  it('runs an executable tool in-loop and returns its result', async () => {
    checkExecute.mockReturnValue({ isDisplayable: false, isExecutable: true });
    execute.mockResolvedValue('42 degrees');

    const [tool] = adapter.toRuntimeTools([fakeTool('get_weather')]);

    expect(tool.execute).toBeDefined();
    const result = await tool.execute!({ city: 'Berlin' }, toolCtx());
    expect(result).toBe('42 degrees');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('leaves display-only tools without execute so the loop ends', () => {
    checkExecute.mockReturnValue({ isDisplayable: true, isExecutable: false });

    const [tool] = adapter.toRuntimeTools([fakeTool('bar_chart')]);

    expect(tool.execute).toBeUndefined();
  });

  it('hands hybrid tools a display acknowledgement, not the raw result', async () => {
    checkExecute.mockReturnValue({ isDisplayable: true, isExecutable: true });
    execute.mockResolvedValue('the document body');

    const [tool] = adapter.toRuntimeTools([fakeTool('create_document')]);
    const result = await tool.execute!({}, toolCtx());

    expect(result).toBe('Tool has been displayed successfully');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('truncates oversized executable results', async () => {
    checkExecute.mockReturnValue({ isDisplayable: false, isExecutable: true });
    execute.mockResolvedValue('x'.repeat(25000));

    const [tool] = adapter.toRuntimeTools([fakeTool('search')]);
    const result = await tool.execute!({}, toolCtx());

    expect(result).toMatch(/too long to display/i);
  });

  it('redacts PII tool output and emits masks in anonymous mode', async () => {
    checkExecute.mockReturnValue({ isDisplayable: false, isExecutable: true });
    execute.mockResolvedValue('call Jane at 555-1234');
    anonymize.mockResolvedValue({
      anonymizedText: 'call {{pii:PERSON_1}} at {{pii:PHONE_1}}',
      masks: [{ token: '{{pii:PERSON_1}}' }],
    });
    const piiTool = {
      name: 'lookup',
      description: 'lookup',
      parameters: { type: 'object' },
      returnsPii: true,
    } as unknown as BackendTool;
    const emit = jest.fn();
    const ctx = {
      context: RunContext.create({ orgId, threadId, isAnonymous: true }),
      toolCallId: 'c1',
      emit,
    } as unknown as ToolExecutionContext;

    const [tool] = adapter.toRuntimeTools([piiTool]);
    const result = await tool.execute!({}, ctx);

    expect(result).toBe('call {{pii:PERSON_1}} at {{pii:PHONE_1}}');
    expect(anonymize).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'thread_pii_masks' }),
    );
  });

  it('surfaces an exposeToLLM tool error message to the model', async () => {
    checkExecute.mockReturnValue({ isDisplayable: false, isExecutable: true });
    execute.mockRejectedValue(
      new ToolExecutionFailedError({
        toolName: 'search',
        message: 'bad query',
        exposeToLLM: true,
      }),
    );

    const [tool] = adapter.toRuntimeTools([fakeTool('search')]);
    const result = await tool.execute!({}, toolCtx());

    expect(result).toContain('bad query');
  });
});
