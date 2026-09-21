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
import {
  buildRunTelemetryIdentity,
  setRunTelemetryIteration,
} from 'src/domain/runs/application/agent-runtime/run-telemetry-context';
import type {
  AfterToolCallContext,
  BeforeToolCallContext,
} from '@ayunis/agent-runtime';

interface ToolUsageHookParams {
  userId: UUID;
  orgId: UUID;
  integrations: RuntimeToolIntegrationRegistry;
  model: string;
  provider: string;
}

interface ToolCallTiming {
  startedAt: number;
}

type ToolCallContext = Pick<
  BeforeToolCallContext,
  'context' | 'iteration' | 'toolCall'
>;

@Injectable()
export class ToolUsageHookFactory {
  private readonly logger = new Logger(ToolUsageHookFactory.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  create(params: ToolUsageHookParams): Hook {
    const timings = new Map<string, ToolCallTiming>();
    return {
      name: 'ayunis-tool-usage',
      beforeModelCall: (ctx) => {
        setRunTelemetryIteration(ctx.context, ctx.iteration);
      },
      beforeToolCall: (ctx) => {
        this.recordToolStart(params, ctx, timings);
        if (ctx.tool) {
          this.emitToolUsed(params, ctx.toolCall.name);
        }
      },
      afterToolCall: (ctx) => {
        this.recordToolCompletion(params, ctx, timings);
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

  private recordToolStart(
    params: ToolUsageHookParams,
    ctx: ToolCallContext,
    timings: Map<string, ToolCallTiming>,
    startedAt = Date.now(),
  ): void {
    const key = toolCallKey(ctx.iteration, ctx.toolCall.id, ctx.toolCall.name);
    timings.set(key, { startedAt });
    this.logger.log(
      {
        ...buildRunTelemetryIdentity(
          ctx.context,
          params.model,
          params.provider,
          ctx.iteration,
        ),
        tool_call_id: ctx.toolCall.id,
        tool_name: ctx.toolCall.name,
        started_at: toTimestamp(startedAt),
      },
      'Agent tool call started',
    );
  }

  private recordToolCompletion(
    params: ToolUsageHookParams,
    ctx: AfterToolCallContext,
    timings: Map<string, ToolCallTiming>,
  ): void {
    const completedAt = Date.now();
    const key = toolCallKey(ctx.iteration, ctx.toolCall.id, ctx.toolCall.name);
    const timing = timings.get(key) ?? { startedAt: completedAt };
    if (!timings.has(key)) {
      this.recordToolStart(params, ctx, timings, completedAt);
    }
    timings.delete(key);
    this.logger.log(
      {
        ...buildRunTelemetryIdentity(
          ctx.context,
          params.model,
          params.provider,
          ctx.iteration,
        ),
        tool_call_id: ctx.toolCall.id,
        tool_name: ctx.toolCall.name,
        started_at: toTimestamp(timing.startedAt),
        completed_at: toTimestamp(completedAt),
        duration_ms: completedAt - timing.startedAt,
        outcome: ctx.outcome,
      },
      'Agent tool call completed',
    );
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

function toolCallKey(
  iteration: number,
  id: string | undefined,
  name: string,
): string {
  return `${iteration}:${id ?? name}`;
}

function toTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString();
}
