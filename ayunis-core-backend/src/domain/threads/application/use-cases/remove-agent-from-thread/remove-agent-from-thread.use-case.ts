import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { RemoveAgentFromThreadCommand } from './remove-agent-from-thread.command';
import { UnexpecteThreadError } from '../../threads.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RemoveAgentFromThreadUseCase {
  private readonly logger = new Logger(RemoveAgentFromThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveAgentFromThreadCommand): Promise<void> {
    this.logger.log('execute', {
      command,
    });

    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId) {
        throw new UnauthorizedException();
      }
      if (!orgId) {
        throw new UnauthorizedException();
      }
      const userDefaultModel = await this.getDefaultModelUseCase.execute({
        orgId,
        userId,
      });

      await this.threadsRepository.updateModel({
        threadId: command.threadId,
        userId,
        permittedModelId: userDefaultModel.id,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to remove agent from thread', {
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new UnexpecteThreadError(error as Error);
    }
  }
}
