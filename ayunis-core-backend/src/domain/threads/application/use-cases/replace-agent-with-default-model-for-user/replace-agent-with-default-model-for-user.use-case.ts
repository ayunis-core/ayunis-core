import { Injectable, Logger } from '@nestjs/common';
import { ReplaceAgentWithDefaultModelForUserCommand } from './replace-agent-with-default-model-for-user.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

/**
 * Use case for replacing an agent with the default model for a specific user's threads
 * This is used when a user loses access to a shared agent (e.g., removed from team)
 */
@Injectable()
export class ReplaceAgentWithDefaultModelForUserUseCase {
  private readonly logger = new Logger(
    ReplaceAgentWithDefaultModelForUserUseCase.name,
  );

  constructor(
    private readonly contextService: ContextService,
    private readonly threadsRepository: ThreadsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async execute(
    command: ReplaceAgentWithDefaultModelForUserCommand,
  ): Promise<void> {
    this.logger.log('execute', command);

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const defaultModel = await this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({
        orgId,
      }),
    );

    await this.threadsRepository.replaceAgentWithModelForUser({
      modelId: defaultModel.id,
      agentId: command.agentId,
      userId: command.userId,
    });
  }
}
