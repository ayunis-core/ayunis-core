import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { NameOwnersQuery } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.query';
import { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import { lookupOwnerOf } from 'src/domain/skills/application/models/collective-skill-owner';
import {
  byName,
  matchesSkillSearch,
  type LinkableSkill,
  type LinkableSkills,
  type OwnedSkill,
} from 'src/domain/skills/application/models/linked-skill';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { ListLinkableWorkspaceSkillsQuery } from './list-linkable-workspace-skills.query';

@Injectable()
export class ListLinkableWorkspaceSkillsUseCase {
  private readonly logger = new Logger(ListLinkableWorkspaceSkillsUseCase.name);

  constructor(
    private readonly links: WorkspaceSkillLinkRepository,
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly nameOwners: NameOwnersUseCase,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListLinkableWorkspaceSkillsQuery,
  ): Promise<LinkableSkills> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Listing linkable workspace skills',
    );
    await this.workspaceWrite.execute({ workspaceId: query.workspaceId });
    const viewer = await this.getViewer.execute();
    const [links, own, collective] = await Promise.all([
      this.links.findByWorkspace(query.workspaceId),
      this.repository.findAllByOwner(viewer.userId),
      this.collectiveRepository.findUsable({
        userId: viewer.userId,
        orgId: viewer.orgId,
        teamIds: viewer.teamIds,
      }),
    ]);
    const linked = new Set(links.map(({ skillId }) => skillId));
    const candidates: LinkableSkill[] = [...own, ...collective].filter(
      (skill) =>
        !linked.has(skill.id) && matchesSkillSearch(skill, query.search),
    );
    return this.group(candidates);
  }

  private async group(skills: LinkableSkill[]): Promise<LinkableSkills> {
    const names = await this.nameOwners.execute(
      new NameOwnersQuery(
        skills.flatMap((skill) => lookupOwnerOf(skill) ?? []),
      ),
    );
    const owned: OwnedSkill[] = skills.flatMap((skill) => {
      const owner = lookupOwnerOf(skill);
      return owner ? [{ skill, owner: names.owner(owner) }] : [];
    });
    const ofType = (type: OwnedSkill['owner']['type']) =>
      owned.filter(({ owner }) => owner.type === type).sort(byName);
    return {
      own: ofType('personal'),
      team: ofType('team'),
      org: ofType('org'),
    };
  }
}
