import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from './remove-knowledge-base-assignments-by-origin-skill.command';

@Injectable()
export class RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase {
  constructor(
    @InjectPinoLogger(RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async execute(
    command: RemoveKnowledgeBaseAssignmentsByOriginSkillCommand,
  ): Promise<void> {
    this.logger.info(
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
