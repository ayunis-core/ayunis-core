import { Injectable, Logger } from '@nestjs/common';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';
import {
  GetAccessibleKnowledgeBaseContextsUseCase,
  type AccessibleKnowledgeBaseContext,
} from 'src/domain/knowledge-bases/application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { GetKnowledgeBasesByIdsQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.query';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';

@Injectable()
export class ListSkillKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListSkillKnowledgeBasesUseCase.name);

  constructor(
    private readonly getKnowledgeBasesByIdsUseCase: GetKnowledgeBasesByIdsUseCase,
    private readonly skillAccessService: SkillAccessService,
    private readonly getKnowledgeBaseContexts: GetAccessibleKnowledgeBaseContextsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListSkillKnowledgeBasesQuery,
  ): Promise<AccessibleKnowledgeBaseContext[]> {
    this.logger.log(
      {
        skillId: query.skillId,
      },
      'Listing knowledge bases for skill',
    );

    const skill = await this.skillAccessService.findAccessibleSkill(
      query.skillId,
    );

    if (skill.knowledgeBaseIds.length === 0) {
      return [];
    }

    const knowledgeBases = await this.getKnowledgeBasesByIdsUseCase.execute(
      new GetKnowledgeBasesByIdsQuery(skill.knowledgeBaseIds),
    );
    return this.getKnowledgeBaseContexts.execute({
      knowledgeBaseIds: knowledgeBases.map(({ id }) => id),
    });
  }
}
