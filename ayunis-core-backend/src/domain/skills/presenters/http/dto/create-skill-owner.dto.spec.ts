import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import {
  CreateSkillOwnerDto,
  CreateSkillOwnerType,
  toCreateSkillOwner,
} from './create-skill-owner.dto';

class TestCreateSkillOwnerDto extends CreateSkillOwnerDto {}

function dtoWith(values: Partial<TestCreateSkillOwnerDto>) {
  return Object.assign(new TestCreateSkillOwnerDto(), values);
}

describe(CreateSkillOwnerDto.name, () => {
  it('maps team ownership with a team id', async () => {
    const teamId = randomUUID();
    const dto = dtoWith({ ownerType: CreateSkillOwnerType.TEAM, teamId });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(toCreateSkillOwner(dto)).toEqual({ type: 'team', teamId });
  });

  it('maps organisation ownership without ids', async () => {
    const dto = dtoWith({ ownerType: CreateSkillOwnerType.ORG });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(toCreateSkillOwner(dto)).toEqual({ type: 'org' });
  });

  it('rejects team ownership without a team id', async () => {
    await expect(
      validate(dtoWith({ ownerType: CreateSkillOwnerType.TEAM })),
    ).resolves.not.toHaveLength(0);
  });

  it('rejects a team id for organisation ownership', async () => {
    await expect(
      validate(
        dtoWith({ ownerType: CreateSkillOwnerType.ORG, teamId: randomUUID() }),
      ),
    ).resolves.not.toHaveLength(0);
  });
});
