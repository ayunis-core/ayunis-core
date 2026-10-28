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

  it('indexes organization-scoped user lookups', () => {
    const index = getMetadataArgsStorage().indices.find(
      (candidate) =>
        candidate.target === UserRecord &&
        Array.isArray(candidate.columns) &&
        candidate.columns.includes('orgId'),
    );

    expect(index).toBeDefined();
  });

  it('persists the account lockout state on the user record', () => {
    const lockoutColumns = getMetadataArgsStorage()
      .columns.filter((column) => column.target === UserRecord)
      .filter((column) =>
        [
          'failedLoginAttempts',
          'failedLoginWindowStartedAt',
          'lockedAt',
        ].includes(column.propertyName),
      );

    expect(
      lockoutColumns
        .map((column) => column.propertyName)
        .sort((first, second) => first.localeCompare(second)),
    ).toEqual([
      'failedLoginAttempts',
      'failedLoginWindowStartedAt',
      'lockedAt',
    ]);
  });
});
