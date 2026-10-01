import type { UUID } from 'crypto';
import type { ToolApprovalDecision } from 'src/domain/runs/application/services/tool-approval-broker.service';

export class DecideToolApprovalCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly toolCallId: string,
    public readonly decision: ToolApprovalDecision,
  ) {}
}
