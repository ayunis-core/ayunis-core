import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { DescribeLinkedWorkspacesQuery } from 'src/domain/workspaces/application/use-cases/describe-linked-workspaces/describe-linked-workspaces.query';
import { DescribeLinkedWorkspacesUseCase } from 'src/domain/workspaces/application/use-cases/describe-linked-workspaces/describe-linked-workspaces.use-case';
import type { LinkedWorkspaces } from 'src/domain/workspaces/domain/workspace-link';
import { ListSkillLinkedWorkspacesQuery } from './list-skill-linked-workspaces.query';

@Injectable()
export class ListSkillLinkedWorkspacesUseCase {
  private readonly logger = new Logger(ListSkillLinkedWorkspacesUseCase.name);

  constructor(
    private readonly links: WorkspaceSkillLinkRepository,
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    @Inject(forwardRef(() => DescribeLinkedWorkspacesUseCase))
    private readonly describeLinkedWorkspaces: DescribeLinkedWorkspacesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListSkillLinkedWorkspacesQuery,
  ): Promise<LinkedWorkspaces> {
    this.logger.log(query, 'Listing workspaces a skill is linked into');
    const skill = await this.repository.findById(query.skillId);
    if (!skill) throw new SkillNotFoundError(query.skillId);
    await this.authorization.requireView(skill);
    const links = await this.links.findBySkill(skill.id);
    return this.describeLinkedWorkspaces.execute(
      new DescribeLinkedWorkspacesQuery(links),
    );
  }
}
