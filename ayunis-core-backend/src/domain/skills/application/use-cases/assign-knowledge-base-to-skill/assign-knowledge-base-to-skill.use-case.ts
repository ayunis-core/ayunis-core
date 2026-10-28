import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { FindKnowledgeBaseQuery } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.query';
import { FindKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillKnowledgeBaseAlreadyAssignedError,
  SkillKnowledgeBaseNotFoundError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { AssignKnowledgeBaseToSkillCommand } from './assign-knowledge-base-to-skill.command';

@Injectable()
export class AssignKnowledgeBaseToSkillUseCase {
  private readonly logger = new Logger(AssignKnowledgeBaseToSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly findKnowledgeBase: FindKnowledgeBaseUseCase,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AssignKnowledgeBaseToSkillCommand): Promise<Skill> {
    this.logger.log(command, 'Assigning knowledge base to skill');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    await this.assertKnowledgeBaseCanBeAssigned(skill, command.knowledgeBaseId);
    if (skill.knowledgeBaseIds.includes(command.knowledgeBaseId)) {
      throw new SkillKnowledgeBaseAlreadyAssignedError(command.knowledgeBaseId);
    }
    const updated = skill.withUpdates({
      knowledgeBaseIds: [...skill.knowledgeBaseIds, command.knowledgeBaseId],
      updatedAt: new Date(),
    });
    return this.repository.update(updated, skill);
  }

  private async assertKnowledgeBaseCanBeAssigned(
    skill: Skill,
    knowledgeBaseId: UUID,
  ): Promise<void> {
    const knowledgeBase =
      await this.findAccessibleKnowledgeBase(knowledgeBaseId);
    const compatible =
      skill instanceof WorkspaceSkill
        ? knowledgeBase instanceof WorkspaceKnowledgeBase &&
          knowledgeBase.workspaceId === skill.workspaceId
        : knowledgeBase instanceof PersonalKnowledgeBase;
    if (!compatible) throw new SkillKnowledgeBaseNotFoundError(knowledgeBaseId);
  }

  private async findAccessibleKnowledgeBase(
    knowledgeBaseId: UUID,
  ): Promise<KnowledgeBase> {
    try {
      const { knowledgeBase } = await this.findKnowledgeBase.execute(
        new FindKnowledgeBaseQuery(knowledgeBaseId),
      );
      return knowledgeBase;
    } catch (error) {
      if (error instanceof KnowledgeBaseNotFoundError) {
        throw new SkillKnowledgeBaseNotFoundError(knowledgeBaseId);
      }
      throw error;
    }
  }
}
