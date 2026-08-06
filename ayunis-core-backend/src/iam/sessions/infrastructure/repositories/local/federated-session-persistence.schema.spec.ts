import { getMetadataArgsStorage } from 'typeorm';
import { RefreshTokenRecord } from './schema/refresh-token.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

type AuthRecord = typeof UserRecord | typeof RefreshTokenRecord;

function columnFor(target: AuthRecord, propertyName: string) {
  return getMetadataArgsStorage().columns.find(
    (column) =>
      column.target === target && column.propertyName === propertyName,
  );
}

describe('Federated session persistence', () => {
  it('allows federated-only users to exist without a local password hash', () => {
    expect(columnFor(UserRecord, 'passwordHash')?.options).toMatchObject({
      nullable: true,
    });
  });

  it('defaults existing and local session families to password authentication', () => {
    expect(
      columnFor(RefreshTokenRecord, 'authenticationMethod')?.options,
    ).toMatchObject({
      type: 'enum',
      enum: SessionAuthenticationMethod,
      default: SessionAuthenticationMethod.PASSWORD,
    });
  });
});
