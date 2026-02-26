import { Injectable, Logger } from '@nestjs/common';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { GetKnowledgeBasesByIdsQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.query';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SkillAccessService } from '../../services/skill-access.service';

@Injectable()
export class ListSkillKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListSkillKnowledgeBasesUseCase.name);

  constructor(
    private readonly getKnowledgeBasesByIdsUseCase: GetKnowledgeBasesByIdsUseCase,
    private readonly skillAccessService: SkillAccessService,
  ) {}

  async execute(query: ListSkillKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log('Listing knowledge bases for skill', {
      skillId: query.skillId,
    });

    try {
      const skill = await this.skillAccessService.findAccessibleSkill(
        query.skillId,
      );

      if (skill.knowledgeBaseIds.length === 0) {
        return [];
      }

      return this.getKnowledgeBasesByIdsUseCase.execute(
        new GetKnowledgeBasesByIdsQuery(skill.knowledgeBaseIds),
      );
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
