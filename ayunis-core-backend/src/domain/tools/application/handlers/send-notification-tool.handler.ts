import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import {
  NotificationInvalidError,
  NotificationLimitReachedError,
} from 'src/domain/notifications/application/notifications.errors';
import { CreateNotificationCommand } from 'src/domain/notifications/application/use-cases/create-notification/create-notification.command';
import { CreateNotificationUseCase } from 'src/domain/notifications/application/use-cases/create-notification/create-notification.use-case';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  SEND_NOTIFICATION_LIMIT_PER_RUN,
  SendNotificationTool,
} from 'src/domain/tools/domain/tools/send-notification-tool.entity';

const SENT_MESSAGE = "The notification was sent to the user's inbox.";
const LIMIT_REACHED_MESSAGE = `This run already sent the maximum of ${SEND_NOTIFICATION_LIMIT_PER_RUN} notifications; this one was not sent. Do not send more. Call ${ToolType.FINISH_ROUTINE} to end the run.`;

/**
 * Posts a routine run's notification to the inbox of the user the run acts
 * for. The run's thread is the routine thread, so each routine execution
 * (nudges included) can send at most the limit.
 */
@Injectable()
export class SendNotificationToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SendNotificationToolHandler.name);

  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(params: {
    tool: SendNotificationTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log(
      { threadId: context.threadId, routineId: tool.origin.routineId },
      'execute',
    );
    const { headline, subheadline, body } = this.validateInput(tool, input);
    const { userId } = getRequiredUserContext(this.contextService);
    try {
      await this.createNotificationUseCase.execute(
        new CreateNotificationCommand({
          userId,
          orgId: context.orgId,
          type: NotificationType.ROUTINE,
          headline,
          subheadline,
          body,
          routineId: tool.origin.routineId,
          routineThreadId: context.threadId,
          limitPerRoutineThread: SEND_NOTIFICATION_LIMIT_PER_RUN,
        }),
      );
    } catch (error) {
      throw toToolError(tool.name, error);
    }
    return SENT_MESSAGE;
  }

  // A schema violation must reach the model so it can correct the call;
  // ExecuteToolUseCase hides raw errors from it.
  private validateInput(
    tool: SendNotificationTool,
    input: Record<string, unknown>,
  ): ReturnType<SendNotificationTool['validateParams']> {
    try {
      return tool.validateParams(input);
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        exposeToLLM: true,
        message: error instanceof Error ? error.message : 'Invalid input',
      });
    }
  }
}

function toToolError(toolName: string, error: unknown): unknown {
  if (error instanceof NotificationLimitReachedError) {
    return new ToolExecutionFailedError({
      toolName,
      exposeToLLM: true,
      message: LIMIT_REACHED_MESSAGE,
    });
  }
  if (error instanceof NotificationInvalidError) {
    return new ToolExecutionFailedError({
      toolName,
      exposeToLLM: true,
      message: error.message,
    });
  }
  return error;
}
