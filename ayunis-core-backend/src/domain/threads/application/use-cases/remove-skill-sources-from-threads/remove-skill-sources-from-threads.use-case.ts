import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveSkillSourcesFromThreadsCommand } from './remove-skill-sources-from-threads.command';

@Injectable()
export class RemoveSkillSourcesFromThreadsUseCase {
  constructor(
    @InjectPinoLogger(RemoveSkillSourcesFromThreadsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async execute(command: RemoveSkillSourcesFromThreadsCommand): Promise<void> {
    this.logger.info(
      {
        skillId: command.skillId,
        userCount: command.userIds.length,
      },
      'execute',
    );

    if (command.userIds.length === 0) {
      return;
    }

    await this.threadsRepository.removeSourceAssignmentsByOriginSkill({
      originSkillId: command.skillId,
      userIds: command.userIds,
    });
  }
}
