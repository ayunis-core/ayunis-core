import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import type { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';
import { CollectiveSkillAccessService } from './collective-skill-access.service';

describe(CollectiveSkillAccessService.name, () => {
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts council meeting minutes.',
    instructions: 'Summarise each agenda item.',
  };
  const teamSkill = new TeamSkill({ ...params, teamId: randomUUID() });
  const orgSkill = new OrgSkill({ ...params, orgId: randomUUID() });

  function setup(access: { canRead: boolean; canManage: boolean }) {
    const getOwnerAccess = { execute: jest.fn().mockResolvedValue(access) };
    const listReadableOwners = { execute: jest.fn() };
    const service = new CollectiveSkillAccessService(
      getOwnerAccess as unknown as GetCollectiveOwnerAccessUseCase,
      listReadableOwners as unknown as ListReadableCollectiveOwnersUseCase,
    );
    return { getOwnerAccess, listReadableOwners, service };
  }

  it('asks for team access with the skill share permissions', async () => {
    const { service, getOwnerAccess } = setup({
      canRead: true,
      canManage: true,
    });

    await service.requireWrite(teamSkill);

    expect(getOwnerAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { type: 'team', teamId: teamSkill.teamId },
        permissions: {
          manage: Permission.MANAGE_SKILLS,
          team: Permission.SHARE_SKILLS_WITH_TEAMS,
          org: Permission.SHARE_SKILLS_WITH_ORG,
        },
      }),
    );
  });

  it('asks only for read access of org skills when reading', async () => {
    const { service, getOwnerAccess } = setup({
      canRead: true,
      canManage: false,
    });

    await service.requireRead(orgSkill);

    expect(getOwnerAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { type: 'org', orgId: orgSkill.orgId },
        permissions: undefined,
      }),
    );
  });

  it('hides skills the user cannot read', async () => {
    const { service } = setup({ canRead: false, canManage: false });

    await expect(service.requireRead(teamSkill)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
    await expect(service.requireWrite(teamSkill)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
  });

  it('forbids changes to readable skills the user cannot manage', async () => {
    const { service } = setup({ canRead: true, canManage: false });

    await expect(service.requireRead(teamSkill)).resolves.toBeUndefined();
    await expect(service.requireWrite(teamSkill)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });

  it('forbids rather than hides creating for an owner the user cannot manage', async () => {
    const { service } = setup({ canRead: false, canManage: false });

    await expect(service.requireManage(teamSkill)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });

  it('allows managers to create', async () => {
    const { service } = setup({ canRead: true, canManage: true });

    await expect(service.requireManage(orgSkill)).resolves.toBeUndefined();
  });
});
