import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillRepository } from '../../ports/skill.repository';
import { UnexpectedSkillError } from '../../skills.errors';
import { CheckKnowledgeBaseSkillShareAccessQuery } from './check-knowledge-base-skill-share-access.query';

/**
 * Checks whether the current user can reach a knowledge base through a shared
 * skill. The grant is a delegation: it only applies to skills owned by the
 * knowledge base's owner, so sharing a skill exposes the owner's own linked
 * knowledge bases and never a knowledge base someone else merely attached.
 */
@Injectable()
export class CheckKnowledgeBaseSkillShareAccessUseCase {
  private readonly logger = new Logger(
    CheckKnowledgeBaseSkillShareAccessUseCase.name,
  );

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: CheckKnowledgeBaseSkillShareAccessQuery,
  ): Promise<boolean> {
    this.logger.log('checkKnowledgeBaseSkillShareAccess', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

    const ownerSkills =
      await this.skillRepository.findSkillsByKnowledgeBaseAndOwners(
        query.knowledgeBaseId,
        [query.knowledgeBaseOwnerId],
      );
    if (ownerSkills.length === 0) {
      return false;
    }

    const skillShares = await this.findSharesByScopeUseCase.execute(
      new FindSharesByScopeQuery(SharedEntityType.SKILL),
    );

    const linkedSkillIds = new Set(ownerSkills.map((skill) => skill.id));
    return skillShares.some((share) => linkedSkillIds.has(share.entityId));
  }
}
