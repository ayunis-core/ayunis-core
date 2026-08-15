import { RunContext } from '@ayunis/agent-runtime';
import type { ToolExecutionContext } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import type { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import { LineChartTool } from 'src/domain/tools/domain/tools/line-chart-tool.entity';
import { PieChartTool } from 'src/domain/tools/domain/tools/pie-chart-tool.entity';
import { SendEmailTool } from 'src/domain/tools/domain/tools/send-email-tool.entity';
import { CreateCalendarEventTool } from 'src/domain/tools/domain/tools/create-calendar-event-tool.entity';
import { CreateSkillTool } from 'src/domain/tools/domain/tools/create-skill-tool.entity';
import { EditSkillTool } from 'src/domain/tools/domain/tools/edit-skill-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { UpdateDocumentTool } from 'src/domain/tools/domain/tools/update-document-tool.entity';
import { EditDocumentTool } from 'src/domain/tools/domain/tools/edit-document-tool.entity';
import { CreateDiagramTool } from 'src/domain/tools/domain/tools/create-diagram-tool.entity';
import { UpdateDiagramTool } from 'src/domain/tools/domain/tools/update-diagram-tool.entity';
import { CreateSpreadsheetTool } from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
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
  let anonymize: jest.Mock;
  let adapter: BackendToolAdapter;

  beforeEach(() => {
    execute = jest.fn();
    anonymize = jest.fn();
    adapter = new BackendToolAdapter(
      { execute } as unknown as ExecuteToolUseCase,
      { execute: anonymize } as unknown as AnonymizeTextForThreadUseCase,
    );
  });

  it('runs an executable tool in-loop and returns its result', async () => {
    execute.mockResolvedValue('42 degrees');

    const [tool] = adapter.toRuntimeTools([fakeTool('get_weather')]);

    expect(tool.execute).toBeDefined();
    const result = await tool.execute!({ city: 'Berlin' }, toolCtx());
    expect(result).toEqual({ result: '42 degrees', isError: false });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it.each([new BarChartTool(), new LineChartTool(), new PieChartTool()])(
    'acknowledges $name and continues without backend execution',
    async (backendTool) => {
      const [tool] = adapter.toRuntimeTools([backendTool]);

      expect(tool.execute).toBeDefined();
      expect(await tool.execute!({}, toolCtx())).toEqual({
        result: 'Tool has been displayed successfully',
        isError: false,
      });
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it('validates acknowledgement-only chart input', () => {
    const [tool] = adapter.toRuntimeTools([new BarChartTool()]);

    expect(() => tool.validateInput!({ chartTitle: 'Incomplete' })).toThrow(
      /missing required parameter 'xAxis'/,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    new SendEmailTool(),
    new CreateCalendarEventTool(),
    new CreateSkillTool(),
    new EditSkillTool(),
  ])(
    'leaves $name without execute so the current run terminates',
    (backendTool) => {
      const [tool] = adapter.toRuntimeTools([backendTool]);

      expect(tool.execute).toBeUndefined();
    },
  );

  it('validates terminal widget input before display (AYC-675)', () => {
    const [tool] = adapter.toRuntimeTools([new CreateCalendarEventTool()]);

    expect(tool.validateInput).toBeDefined();
    expect(() =>
      tool.validateInput!({
        title: 'Budget review',
        description: 'Review the proposed budget',
        location: 'Berlin',
        start: 'not-a-date',
        end: '2026-01-31T15:30:00Z',
      }),
    ).toThrow(
      /The tool didn't provide any result due to the following error in tool usage: 'start' must be a valid ISO 8601 date-time/,
    );
    expect(() =>
      tool.validateInput!({
        title: 'Budget review',
        description: 'Review the proposed budget',
        location: 'Berlin',
        start: '2026-01-31T14:30:00Z',
        end: '2026-01-31T15:30:00Z',
      }),
    ).not.toThrow();
  });

  it.each([
    new CreateDocumentTool(),
    new UpdateDocumentTool(),
    new EditDocumentTool(),
    new CreateDiagramTool(),
    new UpdateDiagramTool(),
    new CreateSpreadsheetTool(),
    new UpdateSpreadsheetTool(),
  ])(
    'executes $name once and returns a display acknowledgement',
    async (backendTool) => {
      execute.mockResolvedValue('raw artifact result');

      const [tool] = adapter.toRuntimeTools([backendTool]);
      const result = await tool.execute!({}, toolCtx());

      expect(result).toEqual({
        result: 'Tool has been displayed successfully',
        isError: false,
      });
      expect(execute).toHaveBeenCalledTimes(1);
    },
  );

  it('returns a hybrid tool execution error instead of a display acknowledgement', async () => {
    execute.mockRejectedValue(
      new ToolExecutionFailedError({
        toolName: 'create_document',
        message: 'Document storage is unavailable',
        exposeToLLM: true,
      }),
    );

    const [tool] = adapter.toRuntimeTools([new CreateDocumentTool()]);
    const result = await tool.execute!({}, toolCtx());

    expect(result).toEqual({
      result: expect.stringContaining('Document storage is unavailable'),
      isError: true,
    });
  });

  it('truncates oversized executable results', async () => {
    execute.mockResolvedValue('x'.repeat(25000));

    const [tool] = adapter.toRuntimeTools([fakeTool('search')]);
    const result = await tool.execute!({}, toolCtx());

    expect(result).toEqual({
      result: expect.stringMatching(/too long to display/i),
      isError: false,
    });
  });

  it('redacts PII tool output and emits masks in anonymous mode', async () => {
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

    expect(result).toEqual({
      result: 'call {{pii:PERSON_1}} at {{pii:PHONE_1}}',
      isError: false,
    });
    expect(anonymize).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'thread_pii_masks' }),
    );
  });

  it('stops the runtime when PII tool output cannot be anonymized', async () => {
    execute.mockResolvedValue('call Jane at 555-1234');
    anonymize.mockRejectedValue(new Error('anonymizer unavailable'));
    const piiTool = {
      ...fakeTool('lookup'),
      returnsPii: true,
    } as unknown as BackendTool;
    const ctx = {
      context: RunContext.create({ orgId, threadId, isAnonymous: true }),
      toolCallId: 'c1',
      emit: jest.fn(),
    } as unknown as ToolExecutionContext;

    const [tool] = adapter.toRuntimeTools([piiTool]);

    await expect(tool.execute!({}, ctx)).rejects.toMatchObject({
      code: 'ANONYMIZATION_UNAVAILABLE',
    });
  });

  // `cause` is process-local and the runtime error event serializes details
  // only, so a classified provider failure must ride in `details` to survive
  // to mapRunError and keep the PROVIDER_UNAVAILABLE_* grouping (AYC-654).
  it('serializes a classified anonymize outage into the runtime error details', async () => {
    execute.mockResolvedValue('call Jane at 555-1234');
    anonymize.mockRejectedValue(
      new ProviderTimeoutError({ provider: 'anonymize' }),
    );
    const piiTool = {
      ...fakeTool('lookup'),
      returnsPii: true,
    } as unknown as BackendTool;
    const ctx = {
      context: RunContext.create({ orgId, threadId, isAnonymous: true }),
      toolCallId: 'c1',
      emit: jest.fn(),
    } as unknown as ToolExecutionContext;

    const [tool] = adapter.toRuntimeTools([piiTool]);

    await expect(tool.execute!({}, ctx)).rejects.toMatchObject({
      code: 'ANONYMIZATION_UNAVAILABLE',
      details: {
        hostError: {
          type: 'provider_timeout',
          context: { provider: 'anonymize' },
        },
      },
    });
  });

  it('surfaces an exposeToLLM tool error message to the model', async () => {
    execute.mockRejectedValue(
      new ToolExecutionFailedError({
        toolName: 'search',
        message: 'bad query',
        exposeToLLM: true,
      }),
    );

    const [tool] = adapter.toRuntimeTools([fakeTool('search')]);
    const result = await tool.execute!({}, toolCtx());

    expect(result).toEqual({
      result: expect.stringContaining('bad query'),
      isError: true,
    });
  });
});
