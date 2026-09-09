import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillKnowledgeBaseNotAssignedError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill';
import { UnassignKnowledgeBaseFromSkillCommand } from './unassign-knowledge-base-from-skill.command';

@Injectable()
export class UnassignKnowledgeBaseFromSkillUseCase {
  private readonly logger = new Logger(
    UnassignKnowledgeBaseFromSkillUseCase.name,
  );

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: UnassignKnowledgeBaseFromSkillCommand,
  ): Promise<Skill> {
    this.logger.log(command, 'Unassigning knowledge base from skill');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    if (!skill.knowledgeBaseIds.includes(command.knowledgeBaseId)) {
      throw new SkillKnowledgeBaseNotAssignedError(command.knowledgeBaseId);
    }
    const updated = skill.withUpdates({
      knowledgeBaseIds: skill.knowledgeBaseIds.filter(
        (id) => id !== command.knowledgeBaseId,
      ),
      updatedAt: new Date(),
    });
    return this.repository.update(updated, skill);
  }
}
