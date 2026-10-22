import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceSkillLinkRepository,
  type PersonalLinkFilter,
  type PersonalSkillLink,
} from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';

@Injectable()
export class FindPersonalSkillLinksUseCase {
  private readonly logger = new Logger(FindPersonalSkillLinksUseCase.name);

  constructor(private readonly links: WorkspaceSkillLinkRepository) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(filter: PersonalLinkFilter): Promise<PersonalSkillLink[]> {
    this.logger.debug(
      {
        workspaceCount: filter.workspaceIds?.length,
        ownerCount: filter.ownerIds?.length,
      },
      'Finding links of personal skills',
    );
    return this.links.findPersonalLinks(filter);
  }
}
