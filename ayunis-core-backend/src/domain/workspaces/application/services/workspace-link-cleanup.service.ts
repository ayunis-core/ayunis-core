import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindPersonalKnowledgeBaseLinksUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-personal-knowledge-base-links/find-personal-knowledge-base-links.use-case';
import { RemoveKnowledgeBaseLinksUseCase } from 'src/domain/knowledge-bases/application/use-cases/remove-knowledge-base-links/remove-knowledge-base-links.use-case';
import { FindPersonalSkillLinksUseCase } from 'src/domain/skills/application/use-cases/find-personal-skill-links/find-personal-skill-links.use-case';
import { RemoveSkillLinksUseCase } from 'src/domain/skills/application/use-cases/remove-skill-links/remove-skill-links.use-case';
import { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { FindTeamsByUserIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-ids-and-org-id/find-teams-by-user-ids-and-org-id.use-case';

interface OwnedLink {
  workspaceId: UUID;
  ownerId: UUID;
}

export interface LinkCleanupScope {
  workspaceIds?: UUID[];
  ownerIds?: UUID[];
}

@Injectable()
export class WorkspaceLinkCleanupService {
  private readonly logger = new Logger(WorkspaceLinkCleanupService.name);

  constructor(
    private readonly workspaces: WorkspacesRepository,
    private readonly sharingRepository: WorkspaceSharingRepository,
    private readonly findTeamsOfUsers: FindTeamsByUserIdsAndOrgIdUseCase,
    @Inject(forwardRef(() => FindPersonalSkillLinksUseCase))
    private readonly findSkillLinks: FindPersonalSkillLinksUseCase,
    @Inject(forwardRef(() => RemoveSkillLinksUseCase))
    private readonly removeSkillLinks: RemoveSkillLinksUseCase,
    @Inject(forwardRef(() => FindPersonalKnowledgeBaseLinksUseCase))
    private readonly findKnowledgeBaseLinks: FindPersonalKnowledgeBaseLinksUseCase,
    @Inject(forwardRef(() => RemoveKnowledgeBaseLinksUseCase))
    private readonly removeKnowledgeBaseLinks: RemoveKnowledgeBaseLinksUseCase,
  ) {}

  async removeLinksOfPeopleWithoutAccess(
    scope: LinkCleanupScope,
  ): Promise<number> {
    const [skillLinks, knowledgeBaseLinks] = await Promise.all([
      this.findSkillLinks.execute(scope),
      this.findKnowledgeBaseLinks.execute(scope),
    ]);
    const all: OwnedLink[] = [...skillLinks, ...knowledgeBaseLinks];
    if (all.length === 0) return 0;
    const hasAccess = await this.accessCheck(all);
    const [skills, knowledgeBases] = await Promise.all([
      this.removeSkillLinks.execute(skillLinks.filter((l) => !hasAccess(l))),
      this.removeKnowledgeBaseLinks.execute(
        knowledgeBaseLinks.filter((l) => !hasAccess(l)),
      ),
    ]);
    if (skills + knowledgeBases > 0) {
      this.logger.log(
        { skills, knowledgeBases },
        'Removed links of people without workspace access',
      );
    }
    return skills + knowledgeBases;
  }

  private async accessCheck(
    links: OwnedLink[],
  ): Promise<(link: OwnedLink) => boolean> {
    const workspaces = await this.workspaces.findManyByIds([
      ...new Set(links.map(({ workspaceId }) => workspaceId)),
    ]);
    const sharings = await this.sharingRepository.loadMany(workspaces);
    const teamsOf = await this.teamsOfOwners(links, sharings, workspaces);
    return ({ workspaceId, ownerId }) =>
      (sharings.get(workspaceId)?.levelOf(ownerId, teamsOf(ownerId)) ??
        null) !== null;
  }

  private async teamsOfOwners(
    links: OwnedLink[],
    sharings: Map<UUID, WorkspaceSharing>,
    workspaces: { id: UUID; orgId: UUID }[],
  ): Promise<(userId: UUID) => UUID[]> {
    const teams = new Map<UUID, UUID[]>();
    for (const orgId of new Set(workspaces.map((w) => w.orgId))) {
      const inOrg = new Set(
        workspaces.filter((w) => w.orgId === orgId).map(({ id }) => id),
      );
      const userIds = [
        ...new Set(
          links
            .filter(
              (l) => inOrg.has(l.workspaceId) && sharings.has(l.workspaceId),
            )
            .map(({ ownerId }) => ownerId),
        ),
      ];
      const found = await this.findTeamsOfUsers.execute({ userIds, orgId });
      for (const [userId, userTeams] of found) {
        teams.set(
          userId,
          userTeams.map(({ id }) => id),
        );
      }
    }
    return (userId) => teams.get(userId) ?? [];
  }
}
