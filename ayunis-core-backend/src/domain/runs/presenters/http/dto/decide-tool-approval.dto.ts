import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { ToolApprovalDecision } from 'src/domain/runs/application/services/tool-approval-broker.service';

const DECISIONS: readonly ToolApprovalDecision[] = ['approved', 'declined'];

export class DecideToolApprovalDto {
  @ApiProperty({
    description: 'Whether the waiting tool call may run',
    enum: DECISIONS,
    example: 'approved',
  })
  @IsIn(DECISIONS)
  decision: ToolApprovalDecision;
}
