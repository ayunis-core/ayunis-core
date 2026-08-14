import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpecteThreadError } from '../../threads.errors';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadTitleCommand } from './update-thread-title.command';

@Injectable()
export class UpdateThreadTitleUseCase {
  constructor(
    @InjectPinoLogger(UpdateThreadTitleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: UpdateThreadTitleCommand): Promise<void> {
    this.logger.info(
      {
        threadId: command.threadId,
        text: command.title,
      },
      'updateTitle',
    );
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    await this.threadsRepository.updateTitle({
      threadId: command.threadId,
      userId,
      title: command.title,
    });
  }
}
