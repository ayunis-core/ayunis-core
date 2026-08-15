import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import type { RunEvent } from '../../run-events';
import { ExecuteRunAndSetTitleUseCase } from '../execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from '../execute-run-and-set-title/execute-run-and-set-title.command';
import { SendMessageCommand } from './send-message.command';

@Injectable()
export class SendMessageUseCase {
  constructor(
    private readonly executeRunAndSetTitleUseCase: ExecuteRunAndSetTitleUseCase,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
    private readonly contextService: ContextService,
    @InjectPinoLogger(SendMessageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async *execute(command: SendMessageCommand): AsyncGenerator<RunEvent> {
    if (command.consumeTrialMessage) {
      this.consumeTrialMessage();
    }

    yield* this.executeRunAndSetTitleUseCase.execute(
      new ExecuteRunAndSetTitleCommand({
        threadId: command.threadId,
        input: command.input,
        streaming: command.streaming,
        signal: command.signal,
      }),
    );
  }

  private consumeTrialMessage(): void {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      this.logger.warn(
        'Skipping trial message increment: no orgId in request context',
      );
      return;
    }

    this.logger.debug(
      {
        orgId,
      },
      'Incrementing trial messages for non-subscription org',
    );

    // Fire-and-forget by design: trial accounting must not delay or fail the
    // run. The .catch keeps a failure out of the unhandledRejection path.
    this.incrementTrialMessagesUseCase
      .execute(new IncrementTrialMessagesCommand(orgId))
      .catch((error: unknown) => {
        this.logger.error(
          {
            orgId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to increment trial messages',
        );
      });
  }
}
