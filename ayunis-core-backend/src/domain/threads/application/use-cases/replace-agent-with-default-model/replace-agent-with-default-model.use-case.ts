import { Injectable, Logger } from '@nestjs/common';
import { ReplaceAgentWithDefaultModelCommand } from './replace-agent-with-default-model.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ReplaceAgentWithDefaultModelUseCase {
  private readonly logger = new Logger(
    ReplaceAgentWithDefaultModelUseCase.name,
  );

  constructor(
    private readonly contextService: ContextService,
    private readonly threadsRepository: ThreadsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async execute(command: ReplaceAgentWithDefaultModelCommand): Promise<void> {
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
    await this.threadsRepository.replaceAgentWithModel({
      modelId: defaultModel.id,
      agentId: command.oldAgentId,
      excludeUserId: command.excludeUserId,
    });
  }
}
