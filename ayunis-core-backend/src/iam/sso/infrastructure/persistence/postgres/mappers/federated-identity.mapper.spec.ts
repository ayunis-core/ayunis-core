import { FederatedIdentityMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/federated-identity.mapper';
import {
  aFederatedIdentity,
  SSO_TEST_ISSUER,
  SSO_TEST_SUBJECT,
  SSO_TEST_USER_ID,
} from 'src/iam/sso/application/testing/sso-provisioning.fixtures';

describe(FederatedIdentityMapper.name, () => {
  it('preserves the identity key and user ownership through a record round trip', () => {
    const mapper = new FederatedIdentityMapper();

    const result = mapper.toDomain(mapper.toRecord(aFederatedIdentity()));

    expect(result).toMatchObject({
      issuer: SSO_TEST_ISSUER,
      subject: SSO_TEST_SUBJECT,
      userId: SSO_TEST_USER_ID,
    });
  });
});
