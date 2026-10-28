import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  GetAccessibleKnowledgeBaseContextsUseCase,
  type AccessibleKnowledgeBaseContext,
} from 'src/domain/knowledge-bases/application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';

@Injectable()
export class ListSkillKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListSkillKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly getKnowledgeBaseContexts: GetAccessibleKnowledgeBaseContextsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListSkillKnowledgeBasesQuery,
  ): Promise<AccessibleKnowledgeBaseContext[]> {
    this.logger.log(
      { skillId: query.skillId },
      'Listing skill knowledge bases',
    );
    const skill = await this.repository.findById(query.skillId);
    if (!skill) throw new SkillNotFoundError(query.skillId);
    await this.authorization.requireRead(skill);
    return this.getKnowledgeBaseContexts.execute({
      knowledgeBaseIds: skill.knowledgeBaseIds,
    });
  }
}
