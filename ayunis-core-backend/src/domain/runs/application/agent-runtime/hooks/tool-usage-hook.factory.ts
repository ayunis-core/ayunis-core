import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ToolUsedEvent } from '../../events/tool-used.event';
import {
  RunToolCompletedEvent,
  type RunToolOutcome,
} from '../../events/run-tool-completed.event';
import type { RuntimeToolIntegrationRegistry } from '../runtime-tool-integration.registry';

interface ToolUsageHookParams {
  userId: UUID;
  orgId: UUID;
  integrations: RuntimeToolIntegrationRegistry;
}

@Injectable()
export class ToolUsageHookFactory {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(ToolUsageHookFactory.name)
    private readonly logger: PinoLogger,
  ) {}

  create(params: ToolUsageHookParams): Hook {
    return {
      name: 'ayunis-tool-usage',
      beforeToolCall: (ctx) => {
        if (ctx.tool) {
          this.emitToolUsed(params, ctx.toolCall.name);
        }
      },
      afterToolCall: (ctx) => {
        const outcome = ctx.outcome;
        if (outcome === 'error') {
          this.logger.warn(
            {
              execution_path: 'agent_runtime',
              tool_name: ctx.toolCall.name,
            },
            'Run tool call failed',
          );
        }
        this.emitToolCompleted(outcome);
      },
    };
  }

  private emitToolCompleted(outcome: RunToolOutcome): void {
    this.eventEmitter
      .emitAsync(
        RunToolCompletedEvent.EVENT_NAME,
        new RunToolCompletedEvent('agent_runtime', outcome),
      )
      .catch((error: unknown) => {
        this.logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to emit RunToolCompletedEvent',
        );
      });
  }

  private emitToolUsed(params: ToolUsageHookParams, toolName: string): void {
    const integration = params.integrations.get(toolName);
    this.eventEmitter
      .emitAsync(
        ToolUsedEvent.EVENT_NAME,
        new ToolUsedEvent(
          params.userId,
          params.orgId,
          toolName,
          integration?.id as UUID | undefined,
          integration?.name,
        ),
      )
      .catch((error: unknown) => {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            toolName,
          },
          'Failed to emit ToolUsedEvent',
        );
      });
  }
}
