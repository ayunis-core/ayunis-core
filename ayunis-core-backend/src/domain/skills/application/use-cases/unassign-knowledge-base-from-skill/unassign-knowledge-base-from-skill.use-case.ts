import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnassignKnowledgeBaseFromSkillCommand } from './unassign-knowledge-base-from-skill.command';

import {
  SkillNotFoundError,
  SkillKnowledgeBaseNotAssignedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class UnassignKnowledgeBaseFromSkillUseCase {
  private readonly logger = new Logger(
    UnassignKnowledgeBaseFromSkillUseCase.name,
  );

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: UnassignKnowledgeBaseFromSkillCommand,
  ): Promise<PersonalSkill> {
    this.logger.log(
      {
        skillId: command.skillId,
        knowledgeBaseId: command.knowledgeBaseId,
      },
      'Unassigning knowledge base from skill',
    );

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }

    if (!skill.knowledgeBaseIds.includes(command.knowledgeBaseId)) {
      throw new SkillKnowledgeBaseNotAssignedError(command.knowledgeBaseId);
    }

    const updatedSkill = skill.withUpdates({
      ...skill,
      knowledgeBaseIds: skill.knowledgeBaseIds.filter(
        (id) => id !== command.knowledgeBaseId,
      ),
    });

    return await this.skillRepository.update(updatedSkill, skill);
  }
}
