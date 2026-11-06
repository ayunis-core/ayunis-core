import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { IsIdForOwnerType } from './is-id-for-owner-type.validator';

class OwnerDto {
  ownerType?: string;

  @IsIdForOwnerType('team')
  teamId?: string;
}

const errorsFor = (values: Partial<OwnerDto>) =>
  validate(Object.assign(new OwnerDto(), values));

describe(IsIdForOwnerType.name, () => {
  it('accepts a UUID for the matching owner type', async () => {
    await expect(
      errorsFor({ ownerType: 'team', teamId: randomUUID() }),
    ).resolves.toHaveLength(0);
  });

  it('accepts an absent id for other owner types', async () => {
    await expect(errorsFor({ ownerType: 'org' })).resolves.toHaveLength(0);
  });

  it.each([
    { ownerType: 'team' },
    { ownerType: 'team', teamId: 'not-a-uuid' },
    { ownerType: 'org', teamId: randomUUID() },
  ])('rejects %j', async (values) => {
    await expect(errorsFor(values)).resolves.not.toHaveLength(0);
  });
});
