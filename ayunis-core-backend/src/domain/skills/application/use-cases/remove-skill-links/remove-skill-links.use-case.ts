import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceSkillLinkRepository,
  type PersonalSkillLink,
} from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';

@Injectable()
export class RemoveSkillLinksUseCase {
  private readonly logger = new Logger(RemoveSkillLinksUseCase.name);

  constructor(private readonly links: WorkspaceSkillLinkRepository) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    links: Pick<PersonalSkillLink, 'workspaceId' | 'skillId'>[],
  ): Promise<number> {
    this.logger.log({ count: links.length }, 'Removing skill links');
    return this.links.removeMany(links);
  }
}
