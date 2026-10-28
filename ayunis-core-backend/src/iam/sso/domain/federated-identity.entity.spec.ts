import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';
import type { UUID } from 'crypto';

const ISSUER = 'https://sso.ayunis.de';
const SUBJECT = '385820595704562041';
const USER_ID = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;

describe(FederatedIdentity.name, () => {
  it('preserves the validated issuer and subject as the durable identity key', () => {
    const identity = new FederatedIdentity({
      issuer: ISSUER,
      subject: SUBJECT,
      userId: USER_ID,
    });

    expect(identity).toMatchObject({
      issuer: ISSUER,
      subject: SUBJECT,
      userId: USER_ID,
    });
    expect(identity.id).toBeDefined();
  });
});
