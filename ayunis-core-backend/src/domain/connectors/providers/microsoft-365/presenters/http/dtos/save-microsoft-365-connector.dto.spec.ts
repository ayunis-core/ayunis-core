import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveMicrosoft365ConnectorDto } from './save-microsoft-365-connector.dto';

const IDS = {
  tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
};

async function constraintsFor(body: object): Promise<string[]> {
  const errors = await validate(
    plainToInstance(SaveMicrosoft365ConnectorDto, body),
  );
  return errors.flatMap((error) => Object.keys(error.constraints ?? {}));
}

describe(SaveMicrosoft365ConnectorDto.name, () => {
  it('rejects a secret of only whitespace, which would overwrite the stored one', async () => {
    expect(await constraintsFor({ ...IDS, clientSecret: '  \t ' })).toEqual([
      'isNotEmpty',
    ]);
  });

  it('rejects a null secret, which would be stored as the credentials', async () => {
    expect(await constraintsFor({ ...IDS, clientSecret: null })).not.toEqual(
      [],
    );
  });

  it('accepts an omitted secret, which keeps the stored one', async () => {
    expect(await constraintsFor(IDS)).toEqual([]);
  });

  it('accepts a secret value', async () => {
    expect(await constraintsFor({ ...IDS, clientSecret: 'Zq8~value' })).toEqual(
      [],
    );
  });
});
