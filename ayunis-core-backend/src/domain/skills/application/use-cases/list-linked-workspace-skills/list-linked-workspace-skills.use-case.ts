import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NameOwnersQuery } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.query';
import { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import { lookupOwnerOf } from 'src/domain/skills/application/models/collective-skill-owner';
import {
  byName,
  matchesSkillSearch,
  type LinkableSkill,
  type LinkedSkill,
} from 'src/domain/skills/application/models/linked-skill';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListLinkedWorkspaceSkillsQuery } from './list-linked-workspace-skills.query';

@Injectable()
export class ListLinkedWorkspaceSkillsUseCase {
  private readonly logger = new Logger(ListLinkedWorkspaceSkillsUseCase.name);

  constructor(
    private readonly links: WorkspaceSkillLinkRepository,
    private readonly repository: SkillRepository,
    private readonly nameOwners: NameOwnersUseCase,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: ListLinkedWorkspaceSkillsQuery): Promise<LinkedSkill[]> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Listing linked workspace skills',
    );
    await this.workspaceRead.execute({ workspaceId: query.workspaceId });
    const links = await this.links.findByWorkspace(query.workspaceId);
    const skills = (
      await this.repository.findByIds(links.map(({ skillId }) => skillId))
    ).filter(
      (skill): skill is LinkableSkill =>
        !(skill instanceof WorkspaceSkill) &&
        matchesSkillSearch(skill, query.search),
    );
    const names = await this.nameOwners.execute(
      new NameOwnersQuery(
        skills.flatMap((skill) => lookupOwnerOf(skill) ?? []),
        links.map(({ linkedByUserId }) => linkedByUserId),
      ),
    );
    const linkBySkill = new Map(links.map((link) => [link.skillId, link]));
    return skills
      .flatMap((skill) => {
        const owner = lookupOwnerOf(skill);
        const link = linkBySkill.get(skill.id);
        if (!owner || !link) return [];
        return [
          {
            skill,
            owner: names.owner(owner),
            linkedBy: names.person(link.linkedByUserId),
            linkedAt: link.linkedAt,
          },
        ];
      })
      .sort(byName);
  }
}
