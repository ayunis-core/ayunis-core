import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { SkillOwnerDto, SkillOwnerType, toSkillOwner } from './skill-owner.dto';

class TestSkillOwnerDto extends SkillOwnerDto {}

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
});
