import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ToolApprovalBrokerService } from 'src/domain/runs/application/services/tool-approval-broker.service';
import {
  ToolApprovalNotFoundError,
  UnexpectedRunError,
} from 'src/domain/runs/application/runs.errors';
import { DecideToolApprovalCommand } from './decide-tool-approval.command';

@Injectable()
export class DecideToolApprovalUseCase {
  private readonly logger = new Logger(DecideToolApprovalUseCase.name);

  constructor(
    private readonly approvalBroker: ToolApprovalBrokerService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  execute(command: DecideToolApprovalCommand): Promise<void> {
    this.logger.log(
      {
        threadId: command.threadId,
        toolCallId: command.toolCallId,
        decision: command.decision,
      },
      'Deciding tool approval',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const settled = this.approvalBroker.decide({
      threadId: command.threadId,
      toolCallId: command.toolCallId,
      userId,
      decision: command.decision,
    });
    if (!settled) {
      throw new ToolApprovalNotFoundError(command.toolCallId);
    }
    return Promise.resolve();
  }
}
