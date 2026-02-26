import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AssignKnowledgeBaseToSkillCommand } from './assign-knowledge-base-to-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillNotFoundError,
  SkillKnowledgeBaseNotFoundError,
  SkillKnowledgeBaseAlreadyAssignedError,
  SkillKnowledgeBaseWrongOrganizationError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class AssignKnowledgeBaseToSkillUseCase {
  private readonly logger = new Logger(AssignKnowledgeBaseToSkillUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    @Inject(KnowledgeBaseRepository)
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: AssignKnowledgeBaseToSkillCommand): Promise<Skill> {
    this.logger.log('Assigning knowledge base to skill', {
      skillId: command.skillId,
      knowledgeBaseId: command.knowledgeBaseId,
    });

    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId || !orgId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillRepository.findOne(command.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      const knowledgeBase = await this.knowledgeBaseRepository.findById(
        command.knowledgeBaseId,
      );
      if (!knowledgeBase) {
        throw new SkillKnowledgeBaseNotFoundError(command.knowledgeBaseId);
      }

      if (knowledgeBase.orgId !== orgId) {
        throw new SkillKnowledgeBaseWrongOrganizationError(
          command.knowledgeBaseId,
        );
      }

      if (skill.knowledgeBaseIds.includes(command.knowledgeBaseId)) {
        throw new SkillKnowledgeBaseAlreadyAssignedError(
          command.knowledgeBaseId,
        );
      }

      const updatedSkill = new Skill({
        ...skill,
        knowledgeBaseIds: [...skill.knowledgeBaseIds, command.knowledgeBaseId],
      });

      return await this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Unexpected error assigning knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
