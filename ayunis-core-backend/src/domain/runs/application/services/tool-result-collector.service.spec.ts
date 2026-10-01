import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import type { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import type { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import { CreateCalendarEventTool } from 'src/domain/tools/domain/tools/create-calendar-event-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { SendEmailTool } from 'src/domain/tools/domain/tools/send-email-tool.entity';
import { RunToolResultInput } from 'src/domain/runs/domain/run-input.entity';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import { RunToolCompletedEvent } from 'src/domain/runs/application/events/run-tool-completed.event';
import type { RunExecutionPath } from 'src/domain/runs/application/run-execution-path';
import { ToolResultCollectorService } from './tool-result-collector.service';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';

const orgId = randomUUID();
const userId = randomUUID();

class BackendTestTool extends Tool {
  constructor(
    name: string,
    private readonly pii = false,
  ) {
    super({
      name,
      description: 'Retrieve municipal information',
      parameters: { type: 'object' },
      type: ToolType.HTTP,
    });
  }

  validateParams(params: Record<string, unknown>): Record<string, unknown> {
    return params;
  }

  get returnsPii(): boolean {
    return this.pii;
  }
}

function toolUse(
  id: string,
  name: string,
  params: Record<string, unknown> = {},
): ToolUseMessageContent {
  return Object.assign(Object.create(ToolUseMessageContent.prototype), {
    id,
    name,
    params,
    type: MessageContentType.TOOL_USE,
  }) as ToolUseMessageContent;
}

function threadWith(...contents: ToolUseMessageContent[]): Thread {
  const message = { content: contents } as AssistantMessage;
  return {
    id: randomUUID(),
    getLastMessage: () => message,
  } as unknown as Thread;
}

function mcpTool(
  upstreamName: string,
  integrationName: string,
): McpIntegrationTool {
  return new McpIntegrationTool(
    new McpTool(
      upstreamName,
      'Upstream tool',
      { type: 'object' },
      randomUUID(),
    ),
    false,
    integrationName,
    null,
  );
}

function chartParams(): Record<string, unknown> {
  return {
    chartTitle: 'Municipal budget',
    xAxis: ['2025', '2026'],
    yAxis: [{ label: 'Budget', values: [42, 48] }],
    insight: 'The proposed budget increases in 2026.',
  };
}

describe('ToolResultCollectorService', () => {
  let executeTool: jest.Mock;
  let anonymize: jest.Mock;
  let emitAsync: jest.Mock;
  let service: ToolResultCollectorService;

  beforeEach(() => {
    executeTool = jest.fn().mockResolvedValue('backend result');
    anonymize = jest.fn();
    emitAsync = jest.fn().mockResolvedValue([]);
    service = new ToolResultCollectorService(
      { execute: executeTool } as unknown as ExecuteToolUseCase,
      { execute: anonymize } as unknown as AnonymizeTextForThreadUseCase,
      { get: jest.fn().mockReturnValue(userId) } as unknown as ContextService,
      { emitAsync } as never,
    );
  });

  it('acknowledges a chart without backend execution', async () => {
    const chart = new BarChartTool();
    const thread = threadWith(toolUse('chart-1', chart.name, chartParams()));

    const result = await collect(service, thread, [chart]);

    expect(result.contents[0].result).toBe(
      'Tool has been displayed successfully',
    );
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('executes a backend tool once and exposes its result', async () => {
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(toolUse('search-1', backendTool.name));

    const result = await collect(service, thread, [backendTool]);

    expect(result.contents[0].result).toBe('backend result');
    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it('exposes backend tool results up to 200,000 characters', async () => {
    const toolResult = 'x'.repeat(200_000);
    executeTool.mockResolvedValue(toolResult);
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(toolUse('search-1', backendTool.name));

    const result = await collect(service, thread, [backendTool]);

    expect(result.contents[0].result).toBe(toolResult);
  });

  it('retains the first 200,000 characters of oversized backend tool results', async () => {
    const retainedResult = 'x'.repeat(200_000);
    executeTool.mockResolvedValue(`${retainedResult}discarded`);
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(toolUse('search-1', backendTool.name));

    const result = await collect(service, thread, [backendTool]);
    const toolResult = result.contents[0].result;

    expect(toolResult.startsWith(retainedResult)).toBe(true);
    expect(toolResult.endsWith('[result truncated]')).toBe(true);
    expect(toolResult).not.toContain('discarded');
  });

  it('resolves a legacy upstream MCP tool name when one integration provides it', async () => {
    const outline = mcpTool('search_documents', 'Outline');
    const thread = threadWith(toolUse('legacy-1', 'search_documents'));

    const result = await collect(service, thread, [
      new CreateDocumentTool(),
      outline,
    ]);

    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(executeTool.mock.calls[0][0].tool).toBe(outline);
    expect(result.contents[0].result).toBe('backend result');
  });

  it('prefers the built-in over an MCP tool with the same upstream name', async () => {
    const builtIn = new CreateDocumentTool();
    const thread = threadWith(
      toolUse('builtin-1', builtIn.name, {
        title: 'Notes',
        content: '<p>Notes</p>',
      }),
    );

    await collect(service, thread, [
      builtIn,
      mcpTool('create_document', 'Outline'),
    ]);

    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(executeTool.mock.calls[0][0].tool).toBe(builtIn);
  });

  it('hands the model the qualified names when several integrations provide a legacy name', async () => {
    const outline = mcpTool('search', 'Outline');
    const records = mcpTool('search', 'Records');
    const thread = threadWith(toolUse('legacy-2', 'search'));

    const result = await collect(service, thread, [outline, records]);

    expect(executeTool).not.toHaveBeenCalled();
    expect(result.contents[0].result).toContain(`"${outline.name}"`);
    expect(result.contents[0].result).toContain(`"${records.name}"`);
  });

  it('still reports an unknown tool name to the model', async () => {
    const thread = threadWith(toolUse('unknown-1', 'nonexistent_tool'));

    const result = await collect(service, thread, [
      mcpTool('search', 'Outline'),
    ]);

    expect(executeTool).not.toHaveBeenCalled();
    expect(result.contents[0].result).toContain('was not found');
  });

  it('executes a hybrid artifact once and exposes the acknowledgement', async () => {
    const document = new CreateDocumentTool();
    const thread = threadWith(
      toolUse('document-1', document.name, {
        title: 'Budget report',
        content: '<p>Budget details</p>',
      }),
    );

    const result = await collect(service, thread, [document]);

    expect(result.contents[0].result).toBe(
      'Tool has been displayed successfully',
    );
    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it('settles every sibling in a mixed terminal and backend batch', async () => {
    const email = new SendEmailTool();
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(
      toolUse('email-1', email.name, {
        subject: 'Budget review',
        body: 'Please review the budget.',
        to: 'budget@example.org',
      }),
      toolUse('search-1', backendTool.name),
    );

    const result = await collect(service, thread, [email, backendTool]);

    expect(result.contents).toHaveLength(2);
    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it('keeps an invalid terminal widget retryable', async () => {
    const calendar = new CreateCalendarEventTool();
    const call = toolUse('calendar-1', calendar.name, {
      title: 'Budget review',
      description: 'Review the budget',
      location: 'Berlin',
      start: 'not-a-date',
      end: '2026-01-31T15:30:00Z',
    });
    const thread = threadWith(call);

    const result = await collect(service, thread, [calendar]);

    expect(result.contents[0].result).toMatch(/'start' must be a valid/);
  });

  it('accepts an explicit client result without revalidating historical input', async () => {
    const calendar = new CreateCalendarEventTool();
    const thread = threadWith(
      toolUse('calendar-1', calendar.name, { start: 'historically-invalid' }),
    );
    const input = new RunToolResultInput(
      'calendar-1',
      calendar.name,
      'Calendar event downloaded',
    );

    const result = await collect(service, thread, [calendar], input);

    expect(result.contents[0].result).toBe('Calendar event downloaded');
  });

  it('anonymizes PII returned by a backend tool', async () => {
    const backendTool = new BackendTestTool('resident_lookup', true);
    executeTool.mockResolvedValue('Jane Doe');
    anonymize.mockResolvedValue({
      anonymizedText: '{{pii:PERSON_1}}',
      masks: [{ id: randomUUID() }],
    });
    const thread = threadWith(toolUse('lookup-1', backendTool.name));

    const result = await collect(
      service,
      thread,
      [backendTool],
      undefined,
      true,
    );

    expect(result.contents[0].result).toBe('{{pii:PERSON_1}}');
    expect(result.piiMasks).toHaveLength(1);
  });

  it('limits PII tool output before anonymization', async () => {
    const retainedResult = 'x'.repeat(30_000);
    const backendTool = new BackendTestTool('resident_lookup', true);
    executeTool.mockResolvedValue(`${retainedResult}discarded`);
    anonymize.mockResolvedValue({
      anonymizedText: 'anonymized result',
      masks: [],
    });
    const thread = threadWith(toolUse('lookup-1', backendTool.name));

    const result = await collect(
      service,
      thread,
      [backendTool],
      undefined,
      true,
    );
    const command = anonymize.mock.calls[0][0] as AnonymizeTextForThreadCommand;

    expect(command.text).toBe(retainedResult);
    expect(result.contents[0].result).toBe(
      'anonymized result\n[result truncated]',
    );
  });

  it('records a successful agent-runtime tool outcome', async () => {
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(toolUse('search-1', backendTool.name));

    await collect(service, thread, [backendTool]);

    expect(emitAsync).toHaveBeenCalledWith(
      RunToolCompletedEvent.EVENT_NAME,
      new RunToolCompletedEvent('agent_runtime', 'success'),
    );
  });

  it('records a failed agent-runtime tool outcome', async () => {
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(toolUse('search-1', backendTool.name));
    executeTool.mockRejectedValue(new Error('Municipal search unavailable'));

    await collect(service, thread, [backendTool]);

    expect(emitAsync).toHaveBeenCalledWith(
      RunToolCompletedEvent.EVENT_NAME,
      new RunToolCompletedEvent('agent_runtime', 'error'),
    );
  });

  it('emits usage for each known tool call', async () => {
    const backendTool = new BackendTestTool('municipal_search');
    const thread = threadWith(toolUse('search-1', backendTool.name));

    await collect(service, thread, [backendTool]);

    expect(emitAsync).toHaveBeenCalledWith(
      ToolUsedEvent.EVENT_NAME,
      expect.objectContaining({
        userId,
        orgId,
        toolName: backendTool.name,
      }),
    );
  });
});

async function collect(
  service: ToolResultCollectorService,
  thread: Thread,
  tools: Tool[],
  input: RunToolResultInput = new RunToolResultInput(
    'client-result',
    'external_widget',
    'Client-provided result',
  ),
  isAnonymous = false,
  executionPath: RunExecutionPath = 'agent_runtime',
) {
  return service.collectToolResults({
    thread,
    tools,
    input,
    orgId,
    isAnonymous,
    executionPath,
  });
}
