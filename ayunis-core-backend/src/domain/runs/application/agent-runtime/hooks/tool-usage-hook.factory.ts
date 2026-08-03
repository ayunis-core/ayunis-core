import type { Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ToolUsedEvent } from '../../events/tool-used.event';

@Injectable()
export class ToolUsageHookFactory {
  private readonly logger = new Logger(ToolUsageHookFactory.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  create(params: { userId: UUID; orgId: UUID }): Hook {
    return {
      name: 'ayunis-tool-usage',
      beforeToolCall: (ctx) => {
        if (ctx.tool) {
          this.emitToolUsed(params, ctx.toolCall.name);
        }
      },
    };
  }

  private emitToolUsed(
    params: { userId: UUID; orgId: UUID },
    toolName: string,
  ): void {
    this.eventEmitter
      .emitAsync(
        ToolUsedEvent.EVENT_NAME,
        new ToolUsedEvent(params.userId, params.orgId, toolName),
      )
      .catch((error: unknown) => {
        this.logger.error('Failed to emit ToolUsedEvent', {
          error: error instanceof Error ? error.message : 'Unknown error',
          toolName,
        });
      });
  }
}
