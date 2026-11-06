import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import {
  SkillListScopeDto,
  SkillOwnerDto,
  SkillOwnerType,
  toSkillListScope,
  toSkillOwner,
} from './skill-owner.dto';

class TestSkillOwnerDto extends SkillOwnerDto {}
class TestSkillListScopeDto extends SkillListScopeDto {}

async function errors(values: Partial<TestSkillOwnerDto>) {
  return validate(Object.assign(new TestSkillOwnerDto(), values));
}

describe(SkillOwnerDto.name, () => {
  it('maps personal ownership without a workspace id', async () => {
    const dto = Object.assign(new TestSkillOwnerDto(), {
      ownerType: SkillOwnerType.PERSONAL,
    });
    await expect(errors(dto)).resolves.toHaveLength(0);
    expect(toSkillOwner(dto)).toEqual({ type: 'personal' });
  });

  it('maps workspace ownership with a workspace id', async () => {
    const workspaceId = randomUUID();
    const dto = Object.assign(new TestSkillOwnerDto(), {
      ownerType: SkillOwnerType.WORKSPACE,
      workspaceId,
    });
    await expect(errors(dto)).resolves.toHaveLength(0);
    expect(toSkillOwner(dto)).toEqual({ type: 'workspace', workspaceId });
  });

  it('rejects workspace ownership without a workspace id', async () => {
    await expect(
      errors({ ownerType: SkillOwnerType.WORKSPACE }),
    ).resolves.not.toHaveLength(0);
  });

  it('rejects a workspace id for personal ownership', async () => {
    await expect(
      errors({
        ownerType: SkillOwnerType.PERSONAL,
        workspaceId: randomUUID(),
      }),
    ).resolves.not.toHaveLength(0);
  });

  it('maps team ownership with a team id', async () => {
    const teamId = randomUUID();
    const dto = Object.assign(new TestSkillOwnerDto(), {
      ownerType: SkillOwnerType.TEAM,
      teamId,
    });
    await expect(errors(dto)).resolves.toHaveLength(0);
    expect(toSkillOwner(dto)).toEqual({ type: 'team', teamId });
  });

  it('maps organization ownership without ids', async () => {
    const dto = Object.assign(new TestSkillOwnerDto(), {
      ownerType: SkillOwnerType.ORG,
    });
    await expect(errors(dto)).resolves.toHaveLength(0);
    expect(toSkillOwner(dto)).toEqual({ type: 'org' });
  });

  it.each<Record<string, string>>([
    { ownerType: SkillOwnerType.TEAM },
    { ownerType: SkillOwnerType.TEAM, teamId: 'not-a-uuid' },
    { ownerType: SkillOwnerType.ORG, teamId: randomUUID() },
    { ownerType: SkillOwnerType.PERSONAL, teamId: randomUUID() },
    {
      ownerType: SkillOwnerType.TEAM,
      teamId: randomUUID(),
      workspaceId: randomUUID(),
    },
  ])('rejects mismatched owner ids: %j', async (values) => {
    await expect(
      errors(values as Partial<TestSkillOwnerDto>),
    ).resolves.not.toHaveLength(0);
  });

  describe(SkillListScopeDto.name, () => {
    it.each([SkillOwnerType.TEAM, SkillOwnerType.ORG])(
      'rejects listing by %s owner',
      async (ownerType) => {
        await expect(
          validate(
            Object.assign(new TestSkillListScopeDto(), {
              ownerType,
              teamId: randomUUID(),
            }),
          ),
        ).resolves.not.toHaveLength(0);
      },
    );

    it('maps the workspace scope', () => {
      const workspaceId = randomUUID();
      expect(
        toSkillListScope(
          Object.assign(new TestSkillListScopeDto(), {
            ownerType: SkillOwnerType.WORKSPACE,
            workspaceId,
          }),
        ),
      ).toEqual({ type: 'workspace', workspaceId });
    });
  });
});
