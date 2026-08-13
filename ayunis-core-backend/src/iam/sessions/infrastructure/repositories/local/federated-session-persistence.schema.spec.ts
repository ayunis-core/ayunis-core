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
});
