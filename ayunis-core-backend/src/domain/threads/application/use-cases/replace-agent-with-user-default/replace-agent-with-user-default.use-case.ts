import { Injectable, Logger } from '@nestjs/common';
import { ReplaceAgentWithUserDefaultCommand } from './replace-agent-with-user-default.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { FindOrgByUserIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-user-id/find-org-by-user-id.use-case';
import { FindOrgByUserIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-user-id/find-org-by-user-id.query';

@Injectable()
export class ReplaceAgentWithUserDefaultUseCase {
  private readonly logger = new Logger(ReplaceAgentWithUserDefaultUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
    private readonly findOrgByUserIdUseCase: FindOrgByUserIdUseCase,
  ) {}

  async execute(command: ReplaceAgentWithUserDefaultCommand): Promise<void> {
    this.logger.log('execute', command);

    const threads = await this.threadsRepository.findAllByAgent(
      command.oldAgentId,
    );
    this.logger.debug('Found threads', {
      threads,
    });

    for (const thread of threads) {
      const org = await this.findOrgByUserIdUseCase.execute(
        new FindOrgByUserIdQuery(thread.userId),
      );
      const defaultModel = await this.getDefaultModelUseCase.execute(
        new GetDefaultModelQuery({
          orgId: org.id,
          userId: thread.userId,
        }),
      );
      const updatedThread = new Thread({
        ...thread,
        agent: undefined,
        model: defaultModel,
      });
      await this.threadsRepository.update(updatedThread);
    }
  }
}
