import type { UUID } from 'crypto';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';

export interface ToolExecutionContext {
  orgId: UUID;
  threadId: UUID;
  isAnonymous?: boolean;
  signal?: AbortSignal;
  /**
   * Receives the chat's full mask dictionary when a tool's result references
   * masks, so the run streams them like the masks of redacted results.
   */
  onPiiMasks?: (masks: ThreadPiiMask[]) => void;
}

export abstract class ToolExecutionHandler {
  abstract execute(params: {
    tool: Tool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string>;
}
