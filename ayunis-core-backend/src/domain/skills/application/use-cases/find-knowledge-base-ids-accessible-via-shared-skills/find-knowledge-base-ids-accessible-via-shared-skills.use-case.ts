import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';

@Injectable()
export class FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase {
  private readonly logger = new Logger(
    FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase.name,
  );

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(): Promise<UUID[]> {
    const shares = await this.findSharesByScopeUseCase.execute(
      new FindSharesByScopeQuery(SharedEntityType.SKILL),
    );
    const skillIds = [...new Set(shares.map((share) => share.entityId))];

    this.logger.log(
      { sharedSkillCount: skillIds.length },
      'findKnowledgeBaseIdsAccessibleViaSharedSkills',
    );

    if (skillIds.length === 0) {
      return [];
    }

    return this.skillRepository.findKnowledgeBaseIdsBySkillIds(skillIds);
  }
}
