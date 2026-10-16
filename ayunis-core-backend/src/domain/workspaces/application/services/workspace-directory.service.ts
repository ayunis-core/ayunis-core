import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import { FindTeamsByOrgIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.query';
import { FindTeamsByOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.use-case';
import { FindTeamsByUserIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-ids-and-org-id/find-teams-by-user-ids-and-org-id.use-case';
import { FindAllUserSummariesByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-summaries-by-org-id/find-all-user-summaries-by-org-id.query';
import { FindAllUserSummariesByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-summaries-by-org-id/find-all-user-summaries-by-org-id.use-case';

@Injectable()
export class WorkspaceDirectoryService {
  constructor(
    private readonly context: ContextService,
    private readonly findPeople: FindAllUserSummariesByOrgIdUseCase,
    private readonly findTeams: FindTeamsByOrgIdUseCase,
    private readonly findTeamsOfPeople: FindTeamsByUserIdsAndOrgIdUseCase,
  ) {}

  async load(): Promise<OrgDirectory> {
    const { orgId } = getRequiredUserContext(this.context);
    return this.loadForOrg(orgId);
  }

  async loadForOrg(orgId: UUID): Promise<OrgDirectory> {
    const [people, teams] = await Promise.all([
      this.findPeople.execute(new FindAllUserSummariesByOrgIdQuery(orgId)),
      this.findTeams.execute(new FindTeamsByOrgIdQuery(orgId)),
    ]);
    const teamsOfPeople = await this.findTeamsOfPeople.execute({
      userIds: people.map(({ id }) => id),
      orgId,
    });
    return new OrgDirectory(
      people.map(({ id, name }) => ({
        id,
        name,
        teams: [...(teamsOfPeople.get(id) ?? [])]
          .map((team) => ({ id: team.id, name: team.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      })),
      teams.map(({ id, name }) => ({ id, name })),
    );
  }
}
