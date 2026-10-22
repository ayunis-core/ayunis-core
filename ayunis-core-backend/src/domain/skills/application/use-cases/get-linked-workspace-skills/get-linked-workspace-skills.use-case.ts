import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill';

@Injectable()
export class GetLinkedWorkspaceSkillsUseCase {
  private readonly logger = new Logger(GetLinkedWorkspaceSkillsUseCase.name);

  constructor(
    private readonly links: WorkspaceSkillLinkRepository,
    private readonly repository: SkillRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: { workspaceId: UUID }): Promise<Skill[]> {
    this.logger.log(query, 'Getting linked workspace skills');
    const links = await this.links.findByWorkspace(query.workspaceId);
    const skills = await this.repository.findByIds(
      links.map(({ skillId }) => skillId),
    );
    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }
}
