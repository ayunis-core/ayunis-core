import { getMetadataArgsStorage } from 'typeorm';
import { UserRecord } from './schema/user.record';

describe('User persistence', () => {
  it('allows federated-only users to exist without a local password hash', () => {
    const passwordHashColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === UserRecord && column.propertyName === 'passwordHash',
    );

    expect(passwordHashColumn?.options).toMatchObject({ nullable: true });
  });
});
