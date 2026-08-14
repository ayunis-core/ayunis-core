import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ToolUsedEvent } from '../../events/tool-used.event';
import type { RuntimeToolIntegrationRegistry } from '../runtime-tool-integration.registry';
import { ToolUsageHookFactory } from './tool-usage-hook.factory';

describe('ToolUsageHookFactory', () => {
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
    const hook = new ToolUsageHookFactory(
      eventEmitter,
      createPinoLoggerMock(),
    ).create({
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
