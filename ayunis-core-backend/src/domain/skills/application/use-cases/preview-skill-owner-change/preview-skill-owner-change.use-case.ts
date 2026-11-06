import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillOwnerChangeService } from 'src/domain/skills/application/services/skill-owner-change.service';
import {
  SkillOwnerChangeNotAllowedError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { PreviewSkillOwnerChangeQuery } from './preview-skill-owner-change.query';

export interface SkillOwnerChangePreview {
  unlinkedKnowledgeBaseCount: number;
}

/** What moving a skill would drop, so the UI can warn before confirming. */
@Injectable()
export class PreviewSkillOwnerChangeUseCase {
  private readonly logger = new Logger(PreviewSkillOwnerChangeUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly ownerChange: SkillOwnerChangeService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: PreviewSkillOwnerChangeQuery,
  ): Promise<SkillOwnerChangePreview> {
    this.logger.log(
      { skillId: query.skillId, ownerType: query.owner.type },
      'Previewing skill owner change',
    );
    const skill = await this.repository.findById(query.skillId);
    if (!skill) throw new SkillNotFoundError(query.skillId);
    await this.authorization.requireWrite(skill);
    if (skill instanceof WorkspaceSkill) {
      throw new SkillOwnerChangeNotAllowedError(skill.id);
    }
    const plan = await this.ownerChange.plan(skill, query.owner);
    return { unlinkedKnowledgeBaseCount: plan.unlinkedKnowledgeBaseIds.length };
  }
}
