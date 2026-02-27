import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveKbAssignmentsByOriginSkillCommand } from './remove-kb-assignments-by-origin-skill.command';

@Injectable()
export class RemoveKbAssignmentsByOriginSkillUseCase {
  private readonly logger = new Logger(
    RemoveKbAssignmentsByOriginSkillUseCase.name,
  );

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(
    command: RemoveKbAssignmentsByOriginSkillCommand,
  ): Promise<void> {
    this.logger.log('execute', {
      skillId: command.skillId,
      userCount: command.userIds.length,
    });

    if (command.userIds.length === 0) {
      return;
    }

    await this.threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill({
      originSkillId: command.skillId,
      userIds: command.userIds,
    });
  }
}
