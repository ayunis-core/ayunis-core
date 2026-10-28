import { validate } from 'class-validator';
import { CreateOrgRequestDto } from 'src/iam/orgs/presenters/http/dtos/create-org-request.dto';
import { UpdateOrgRequestDto } from 'src/iam/orgs/presenters/http/dtos/update-org-request.dto';

async function constraintsFor(
  dto: CreateOrgRequestDto | UpdateOrgRequestDto,
): Promise<string[]> {
  const errors = await validate(dto);
  return errors
    .flatMap((error) => Object.keys(error.constraints ?? {}))
    .sort((a, b) => a.localeCompare(b));
}

describe(UpdateOrgRequestDto.name, () => {
  it('accepts a name', async () => {
    const dto = Object.assign(new UpdateOrgRequestDto(), {
      name: 'Acme Corporation',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each([{ name: '' }, { name: undefined }, { name: 42 }])(
    'validates %p exactly like the create request',
    async (payload) => {
      const update = Object.assign(new UpdateOrgRequestDto(), payload);
      const create = Object.assign(new CreateOrgRequestDto(), payload);

      const updateConstraints = await constraintsFor(update);

      expect(updateConstraints).not.toEqual([]);
      expect(updateConstraints).toEqual(await constraintsFor(create));
    },
  );
});
