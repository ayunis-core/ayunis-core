import { randomUUID } from 'crypto';
import { OwnerNames } from 'src/domain/ownership/application/models/owner-names';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { ListLinkableWorkspaceSkillsQuery } from './list-linkable-workspace-skills.query';
import { ListLinkableWorkspaceSkillsUseCase } from './list-linkable-workspace-skills.use-case';

const text = { shortDescription: 'Beschreibung', instructions: 'Tu es.' };

describe(ListLinkableWorkspaceSkillsUseCase.name, () => {
  it('groups usable skills by owner and leaves out linked ones', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const teamId = randomUUID();
    const workspaceId = randomUUID();
    const own = new PersonalSkill({ ...text, name: 'Eigene', userId });
    const alreadyLinked = new PersonalSkill({ ...text, name: 'Da', userId });
    const team = new TeamSkill({ ...text, name: 'Team', teamId, orgId });
    const org = new OrgSkill({ ...text, name: 'Org', orgId });
    const useCase = new ListLinkableWorkspaceSkillsUseCase(
      {
        findByWorkspace: jest
          .fn()
          .mockResolvedValue([{ skillId: alreadyLinked.id }]),
      } as unknown as WorkspaceSkillLinkRepository,
      {
        findAllByOwner: jest.fn().mockResolvedValue([own, alreadyLinked]),
      } as unknown as SkillRepository,
      {
        findUsable: jest.fn().mockResolvedValue([team, org]),
      } as unknown as CollectiveSkillRepository,
      {
        execute: jest.fn().mockResolvedValue(
          new OwnershipViewer({
            userId,
            orgId,
            isAdmin: false,
            permissions: [],
            memberTeamIds: [teamId],
            adminTeamIds: [],
            teamAdminPermissions: [],
          }),
        ),
      } as unknown as GetOwnershipViewerUseCase,
      {
        execute: jest
          .fn()
          .mockResolvedValue(
            new OwnerNames(
              new Map([[userId, 'Lena Hoffmann']]),
              new Map([[teamId, 'Bauamt']]),
            ),
          ),
      } as unknown as NameOwnersUseCase,
      { execute: jest.fn() } as unknown as AssertWorkspaceWriteAccessUseCase,
    );

    const result = await useCase.execute(
      new ListLinkableWorkspaceSkillsQuery(workspaceId),
    );

    expect(result.own.map(({ skill }) => skill)).toEqual([own]);
    expect(result.team).toEqual([
      { skill: team, owner: { type: 'team', id: teamId, name: 'Bauamt' } },
    ]);
    expect(result.org.map(({ skill }) => skill)).toEqual([org]);
  });
});
