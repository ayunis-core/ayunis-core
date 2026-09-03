import { randomUUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import { RunToolCompletedEvent } from 'src/domain/runs/application/events/run-tool-completed.event';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import { ToolUsageHookFactory } from './tool-usage-hook.factory';

describe('ToolUsageHookFactory', () => {
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
    });

    await hook.afterToolCall?.({
      isError: true,
      outcome: 'error',
      toolCall: { name: 'municipal_search' },
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
    });

    await hook.afterToolCall?.({
      isError: true,
      outcome: 'aborted',
      toolCall: { name: 'municipal_search' },
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
    });

    hook.beforeToolCall?.({
      tool: {},
      toolCall: { name: 'search_council_sessions' },
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
