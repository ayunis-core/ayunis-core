import { getMetadataArgsStorage } from 'typeorm';
import { RefreshTokenRecord } from './schema/refresh-token.record';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

function columnFor(propertyName: string) {
  return getMetadataArgsStorage().columns.find(
    (column) =>
      column.target === RefreshTokenRecord &&
      column.propertyName === propertyName,
  );
}

describe('Federated session persistence', () => {
  it('configures password as the default session authentication method', () => {
    expect(columnFor('authenticationMethod')?.options).toMatchObject({
      type: 'enum',
      enum: SessionAuthenticationMethod,
      default: SessionAuthenticationMethod.PASSWORD,
    });
  });

  it('indexes the optional Zitadel session identifier', () => {
    expect(columnFor('zitadelSessionId')?.options).toMatchObject({
      type: 'varchar',
      nullable: true,
    });
    expect(
      getMetadataArgsStorage().indices.some(
        (index) =>
          index.target === RefreshTokenRecord &&
          Array.isArray(index.columns) &&
          index.columns.includes('zitadelSessionId'),
      ),
    ).toBe(true);
  });

  it('stores the optional absolute SSO family expiry', () => {
    expect(columnFor('familyExpiresAt')?.options).toMatchObject({
      type: 'timestamptz',
      nullable: true,
    });
  });
});
