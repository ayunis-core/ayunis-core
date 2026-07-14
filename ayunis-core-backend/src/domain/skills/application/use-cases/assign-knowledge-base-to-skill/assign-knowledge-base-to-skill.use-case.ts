import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssignKnowledgeBaseToSkillCommand } from './assign-knowledge-base-to-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { GetKnowledgeBasesByIdsQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.query';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillNotFoundError,
  SkillKnowledgeBaseNotFoundError,
  SkillKnowledgeBaseAlreadyAssignedError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class AssignKnowledgeBaseToSkillUseCase {
  private readonly logger = new Logger(AssignKnowledgeBaseToSkillUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly getKnowledgeBasesByIdsUseCase: GetKnowledgeBasesByIdsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AssignKnowledgeBaseToSkillCommand): Promise<Skill> {
    this.logger.log('Assigning knowledge base to skill', {
      skillId: command.skillId,
      knowledgeBaseId: command.knowledgeBaseId,
    });

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedAccessError();
    }

    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }

    const knowledgeBases = await this.getKnowledgeBasesByIdsUseCase.execute(
      new GetKnowledgeBasesByIdsQuery([command.knowledgeBaseId]),
    );
    if (knowledgeBases.length === 0) {
      throw new SkillKnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    if (skill.knowledgeBaseIds.includes(command.knowledgeBaseId)) {
      throw new SkillKnowledgeBaseAlreadyAssignedError(command.knowledgeBaseId);
    }

    const updatedSkill = new Skill({
      ...skill,
      knowledgeBaseIds: [...skill.knowledgeBaseIds, command.knowledgeBaseId],
    });

    return this.skillRepository.update(updatedSkill);
  }
}
