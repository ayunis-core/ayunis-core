import type { Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import {
  RunToolCompletedEvent,
  type RunToolOutcome,
} from 'src/domain/runs/application/events/run-tool-completed.event';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';

interface ToolUsageHookParams {
  userId: UUID;
  orgId: UUID;
  integrations: RuntimeToolIntegrationRegistry;
}

@Injectable()
export class ToolUsageHookFactory {
  private readonly logger = new Logger(ToolUsageHookFactory.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

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
