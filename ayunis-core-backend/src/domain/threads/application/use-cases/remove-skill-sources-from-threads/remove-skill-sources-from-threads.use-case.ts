import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveSkillSourcesFromThreadsCommand } from './remove-skill-sources-from-threads.command';

@Injectable()
export class RemoveSkillSourcesFromThreadsUseCase {
  private readonly logger = new Logger(
    RemoveSkillSourcesFromThreadsUseCase.name,
  );

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: RemoveSkillSourcesFromThreadsCommand): Promise<void> {
    this.logger.log('execute', {
      skillId: command.skillId,
      userCount: command.userIds.length,
    });

    if (command.userIds.length === 0) {
      return;
    }

    await this.threadsRepository.removeSourceAssignmentsByOriginSkill({
      originSkillId: command.skillId,
      userIds: command.userIds,
    });
  }
}
