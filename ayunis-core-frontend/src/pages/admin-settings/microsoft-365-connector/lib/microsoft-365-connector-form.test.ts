import { describe, expect, it } from 'vitest';
import { toSaveMicrosoft365ConnectorDto } from './microsoft-365-connector-form';

const IDS = {
  tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
};

describe('toSaveMicrosoft365ConnectorDto', () => {
  it('leaves out an empty secret field, so saving keeps the stored secret', () => {
    const dto = toSaveMicrosoft365ConnectorDto({ ...IDS, clientSecret: '' });

    expect(dto).toEqual(IDS);
    expect('clientSecret' in dto).toBe(false);
  });

  it('leaves out a secret field of only whitespace, so saving keeps the stored secret', () => {
    const dto = toSaveMicrosoft365ConnectorDto({
      ...IDS,
      clientSecret: '  \t ',
    });

    expect('clientSecret' in dto).toBe(false);
  });

  it('sends a newly entered secret', () => {
    expect(
      toSaveMicrosoft365ConnectorDto({ ...IDS, clientSecret: 'Zq8~value' }),
    ).toEqual({ ...IDS, clientSecret: 'Zq8~value' });
  });
});
