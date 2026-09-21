import { randomUUID } from 'crypto';
import { RunContext } from '@ayunis/agent-runtime';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import { RunToolCompletedEvent } from 'src/domain/runs/application/events/run-tool-completed.event';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import { ToolUsageHookFactory } from './tool-usage-hook.factory';

describe('ToolUsageHookFactory', () => {
  it('logs correlated tool start and completion timing without payloads', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'));
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;
    const logger = createLoggerMock();
    const params = {
      userId: randomUUID(),
      orgId: randomUUID(),
      integrations: {
        get: jest.fn(),
      } as unknown as RuntimeToolIntegrationRegistry,
      model: 'claude-sonnet-4-5',
      provider: 'anthropic',
    };
    const hook = new ToolUsageHookFactory(eventEmitter).create(params);
    const context = RunContext.create();
    const toolCall = {
      id: 'tool-call-1',
      name: 'municipal_search',
      input: { query: 'private council material' },
    };

    await hook.beforeToolCall?.({
      context,
      iteration: 3,
      tool: {},
      toolCall,
    } as never);
    jest.setSystemTime(new Date('2026-09-21T12:00:00.425Z'));
    await hook.afterToolCall?.({
      context,
      iteration: 3,
      outcome: 'success',
      result: 'private retrieved page content',
      toolCall,
    } as never);

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: context.runId,
        request_id: expect.any(String),
        model: 'claude-sonnet-4-5',
        provider: 'anthropic',
        environment: expect.any(String),
        iteration: 3,
        tool_call_id: 'tool-call-1',
        tool_name: 'municipal_search',
        started_at: '2026-09-21T12:00:00.000Z',
      }),
      'Agent tool call started',
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        completed_at: '2026-09-21T12:00:00.425Z',
        duration_ms: 425,
        outcome: 'success',
      }),
      'Agent tool call completed',
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(
      'private council material',
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(
      'private retrieved page content',
    );
    jest.useRealTimers();
  });

  it('records agent-runtime tool failures after settlement', async () => {
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;
    const hook = new ToolUsageHookFactory(eventEmitter).create({
      userId: randomUUID(),
      orgId: randomUUID(),
      integrations: {
        get: jest.fn(),
      } as unknown as RuntimeToolIntegrationRegistry,
      model: 'claude-sonnet-4-5',
      provider: 'anthropic',
    });

    await hook.afterToolCall?.({
      context: RunContext.create(),
      iteration: 0,
      isError: true,
      outcome: 'error',
      toolCall: { id: 'tool-call-1', name: 'municipal_search' },
    } as never);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunToolCompletedEvent.EVENT_NAME,
      new RunToolCompletedEvent('agent_runtime', 'error'),
    );
  });

  it('does not classify a tool skipped after run abort as a failure', async () => {
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;
    const hook = new ToolUsageHookFactory(eventEmitter).create({
      userId: randomUUID(),
      orgId: randomUUID(),
      integrations: {
        get: jest.fn(),
      } as unknown as RuntimeToolIntegrationRegistry,
      model: 'claude-sonnet-4-5',
      provider: 'anthropic',
    });

    await hook.afterToolCall?.({
      context: RunContext.create(),
      iteration: 0,
      isError: true,
      outcome: 'aborted',
      toolCall: { id: 'tool-call-1', name: 'municipal_search' },
    } as never);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunToolCompletedEvent.EVENT_NAME,
      new RunToolCompletedEvent('agent_runtime', 'aborted'),
    );
  });

  it('should include MCP integration identity in runtime tool usage events', () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const integrationId = randomUUID();
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;
    const integrations = {
      get: jest.fn().mockReturnValue({
        id: integrationId,
        name: 'Council Data',
        logoUrl: null,
      }),
    } as unknown as RuntimeToolIntegrationRegistry;
    const hook = new ToolUsageHookFactory(eventEmitter).create({
      userId,
      orgId,
      integrations,
      model: 'claude-sonnet-4-5',
      provider: 'anthropic',
    });

    hook.beforeToolCall?.({
      context: RunContext.create(),
      iteration: 0,
      tool: {},
      toolCall: { id: 'tool-call-1', name: 'search_council_sessions' },
    } as never);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      ToolUsedEvent.EVENT_NAME,
      expect.objectContaining({
        userId,
        orgId,
        toolName: 'search_council_sessions',
        integrationId,
        integrationName: 'Council Data',
      }),
    );
  });
});
