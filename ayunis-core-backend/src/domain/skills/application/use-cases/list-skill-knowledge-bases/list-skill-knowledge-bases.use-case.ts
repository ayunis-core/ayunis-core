import { Injectable, Logger } from '@nestjs/common';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { GetKnowledgeBasesByIdsQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.query';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';

@Injectable()
export class ListSkillKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListSkillKnowledgeBasesUseCase.name);

  constructor(
    private readonly getKnowledgeBasesByIdsUseCase: GetKnowledgeBasesByIdsUseCase,
    private readonly skillAccessService: SkillAccessService,
  ) {}

  async execute(query: ListSkillKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log(
      {
        skillId: query.skillId,
      },
      'Listing knowledge bases for skill',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error listing skill knowledge bases',
      );
      throw new UnexpectedSkillError(error);
    }
  }
}
