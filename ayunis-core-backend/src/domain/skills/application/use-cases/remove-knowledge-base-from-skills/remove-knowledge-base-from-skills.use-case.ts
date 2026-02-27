import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { RemoveKnowledgeBaseFromSkillsCommand } from './remove-knowledge-base-from-skills.command';

@Injectable()
export class RemoveKnowledgeBaseFromSkillsUseCase {
  private readonly logger = new Logger(
    RemoveKnowledgeBaseFromSkillsUseCase.name,
  );

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
  ) {}

  async execute(command: RemoveKnowledgeBaseFromSkillsCommand): Promise<void> {
    this.logger.log('execute', {
      knowledgeBaseId: command.knowledgeBaseId,
      skillCount: command.skillIds.length,
    });

    if (command.skillIds.length === 0) {
      return;
    }

    await this.skillRepository.removeKnowledgeBaseFromSkills(
      command.knowledgeBaseId,
      command.skillIds,
    );
  }
}
