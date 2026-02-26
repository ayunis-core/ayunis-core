import { Inject, Injectable, Logger } from '@nestjs/common';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SkillAccessService } from '../../services/skill-access.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ListSkillKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListSkillKnowledgeBasesUseCase.name);

  constructor(
    @Inject(KnowledgeBaseRepository)
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: ListSkillKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log('Listing knowledge bases for skill', {
      skillId: query.skillId,
    });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillAccessService.findAccessibleSkill(
        query.skillId,
      );

      if (skill.knowledgeBaseIds.length === 0) {
        return [];
      }

      const knowledgeBases = await this.knowledgeBaseRepository.findByIds(
        skill.knowledgeBaseIds,
      );

      return knowledgeBases.filter((kb) => kb.orgId === orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error listing skill knowledge bases', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
