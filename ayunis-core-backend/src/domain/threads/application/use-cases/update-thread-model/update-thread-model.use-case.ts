import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadModelCommand } from './update-thread-model.command';
import { ThreadUpdateError } from '../../threads.errors';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { GetPermittedModelQuery } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { FindOrgByUserIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-user-id/find-org-by-user-id.use-case';
import { FindOrgByUserIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-user-id/find-org-by-user-id.query';

@Injectable()
export class UpdateThreadModelUseCase {
  private readonly logger = new Logger(UpdateThreadModelUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
    private readonly findOrgByUserIdUseCase: FindOrgByUserIdUseCase,
  ) {}

  async execute(command: UpdateThreadModelCommand): Promise<void> {
    this.logger.log('updateModel', {
      threadId: command.threadId,
      modelId: command.modelId,
    });

    try {
      const org = await this.findOrgByUserIdUseCase.execute(
        new FindOrgByUserIdQuery(command.userId),
      );
      const model = await this.getPermittedModelUseCase.execute(
        new GetPermittedModelQuery({
          permittedModelId: command.modelId,
          orgId: org.id,
        }),
      );
      await this.threadsRepository.updateModel(
        command.threadId,
        command.userId,
        model,
      );
    } catch (error) {
      this.logger.error('Failed to update thread model', {
        threadId: command.threadId,
        modelId: command.modelId,
        error,
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
