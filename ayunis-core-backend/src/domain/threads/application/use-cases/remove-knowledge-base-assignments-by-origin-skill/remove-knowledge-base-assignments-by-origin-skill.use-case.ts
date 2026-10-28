import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from './remove-knowledge-base-assignments-by-origin-skill.command';

@Injectable()
export class RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase {
  private readonly logger = new Logger(
    RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase.name,
  );

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(
    command: RemoveKnowledgeBaseAssignmentsByOriginSkillCommand,
  ): Promise<void> {
    this.logger.log(
      {
        skillId: command.skillId,
        userCount: command.userIds.length,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'execute',
    );

    if (command.userIds.length === 0) {
      return;
    }

    await this.threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill({
      originSkillId: command.skillId,
      userIds: command.userIds,
      knowledgeBaseId: command.knowledgeBaseId,
    });
  }
}
