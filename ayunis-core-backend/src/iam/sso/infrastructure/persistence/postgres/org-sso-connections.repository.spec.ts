import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import {
  TEST_ORG_ID,
  anOrgSsoConnection,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { SsoConnectionUniqueConstraintError } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import type { OrgSsoEmailDomainRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-email-domain.record';

describe(PostgresOrgSsoConnectionsRepository.name, () => {
  let connectionRecords: jest.Mocked<
    Pick<Repository<OrgSsoConnectionRecord>, 'findOne' | 'save' | 'update'>
  >;
  let domainRecords: jest.Mocked<
    Pick<Repository<OrgSsoEmailDomainRecord>, 'delete' | 'insert'>
  >;
  let repository: PostgresOrgSsoConnectionsRepository;

  beforeEach(() => {
    const mapper = new OrgSsoConnectionMapper();
    const record = mapper.toRecord(anOrgSsoConnection());
    connectionRecords = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    domainRecords = {
      delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] }),
    };
    const txHost = {
      tx: {
        getRepository: jest.fn((target) =>
          target === OrgSsoConnectionRecord ? connectionRecords : domainRecords,
        ),
      },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
    repository = new PostgresOrgSsoConnectionsRepository(txHost, mapper);
  });

  it('replaces all domains only after the disabled mapping CAS succeeds', async () => {
    const verifiedAt = new Date('2026-08-27T12:00:00.000Z');
    const expected = anOrgSsoConnection({ emailDomain: 'old.example' });
    const connection = anOrgSsoConnection({
      emailDomains: [
        { emailDomain: 'bit.bremerhaven.de', verifiedAt },
        { emailDomain: 'vhs.bremerhaven.de', verifiedAt },
      ],
    });

    await repository.updateConfigurationIfDisabled(connection, expected);

    expect(connectionRecords.update).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: TEST_ORG_ID,
        emailDomain: 'old.example',
        enabled: false,
        updatedAt: expected.updatedAt,
      }),
      expect.objectContaining({ emailDomain: 'bit.bremerhaven.de' }),
    );
    expect(domainRecords.delete).toHaveBeenCalledWith({
      orgSsoConnectionId: connection.id,
    });
    expect(domainRecords.insert).toHaveBeenCalledWith([
      expect.objectContaining({ emailDomain: 'bit.bremerhaven.de' }),
      expect.objectContaining({ emailDomain: 'vhs.bremerhaven.de' }),
    ]);
  });

  it('returns canonical domain state from the same stored aggregate', async () => {
    const mapper = new OrgSsoConnectionMapper();
    const record = mapper.toRecord(
      anOrgSsoConnection({ emailDomain: 'legacy.example' }),
    );
    record.emailDomains = mapper.toRecord(
      anOrgSsoConnection({ emailDomain: 'canonical.example' }),
    ).emailDomains;
    connectionRecords.findOne.mockResolvedValue(record);

    const state = await repository.findByOrgIdWithDomainState(TEST_ORG_ID);

    expect(state).toMatchObject({
      connection: { emailDomain: 'canonical.example' },
      hasCanonicalEmailDomains: true,
    });
  });

  it('reads only the local password login policy for authentication checks', async () => {
    connectionRecords.findOne.mockResolvedValue({
      localPasswordLoginEnabled: false,
    } as OrgSsoConnectionRecord);

    await expect(
      repository.findLocalPasswordLoginEnabledByOrgId(TEST_ORG_ID),
    ).resolves.toBe(false);
    expect(connectionRecords.findOne).toHaveBeenCalledWith({
      where: { orgId: TEST_ORG_ID },
      select: { localPasswordLoginEnabled: true },
    });
  });

  it('takes a shared row lock while issuing a password session', async () => {
    connectionRecords.findOne.mockResolvedValue({
      localPasswordLoginEnabled: true,
    } as OrgSsoConnectionRecord);

    await repository.findLocalPasswordLoginEnabledByOrgIdForSessionIssuance(
      TEST_ORG_ID,
    );

    expect(connectionRecords.findOne).toHaveBeenCalledWith({
      where: { orgId: TEST_ORG_ID },
      select: { localPasswordLoginEnabled: true },
      lock: { mode: 'pessimistic_read' },
    });
  });

  it('takes an exclusive row lock before mutating authentication state', async () => {
    await expect(repository.acquireMutationLock(TEST_ORG_ID)).resolves.toBe(
      true,
    );

    expect(connectionRecords.findOne).toHaveBeenCalledWith({
      where: { orgId: TEST_ORG_ID },
      select: { id: true },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('identifies a legacy fallback without canonical domain rows', async () => {
    const mapper = new OrgSsoConnectionMapper();
    const record = mapper.toRecord(anOrgSsoConnection());
    record.emailDomains = [];
    connectionRecords.findOne.mockResolvedValue(record);

    const state = await repository.findByOrgIdWithDomainState(TEST_ORG_ID);

    expect(state).toMatchObject({
      connection: { emailDomain: 'stadt.example' },
      hasCanonicalEmailDomains: false,
    });
  });

  it('does not replace domains when the mapping CAS misses', async () => {
    connectionRecords.update.mockResolvedValue({
      affected: 0,
      raw: [],
      generatedMaps: [],
    });

    await expect(
      repository.updateConfigurationIfDisabled(
        anOrgSsoConnection(),
        anOrgSsoConnection(),
      ),
    ).resolves.toBeNull();
    expect(domainRecords.delete).not.toHaveBeenCalled();
    expect(domainRecords.insert).not.toHaveBeenCalled();
  });

  it('enables only the exact connection version that was reviewed', async () => {
    const connection = anOrgSsoConnection();

    await repository.setEnabled(connection, true);

    expect(connectionRecords.update).toHaveBeenCalledWith(
      { orgId: TEST_ORG_ID, updatedAt: connection.updatedAt },
      { enabled: true, updatedAt: expect.any(Date) },
    );
  });

  it('updates local password login without changing SSO enablement', async () => {
    const connection = anOrgSsoConnection({ enabled: true });

    const updated =
      await repository.setLocalPasswordLoginEnabledIfMappingMatches(
        connection,
        false,
      );

    expect(connectionRecords.update).toHaveBeenCalledWith(
      { orgId: TEST_ORG_ID, updatedAt: connection.updatedAt },
      { localPasswordLoginEnabled: false, updatedAt: expect.any(Date) },
    );
    expect(updated).toMatchObject({
      enabled: true,
      localPasswordLoginEnabled: false,
    });
  });

  it('returns the exact update without reloading concurrently changed state', async () => {
    const connection = anOrgSsoConnection({ zitadelIdpId: 'idp-1' });

    const updated = await repository.setZitadelIdpIdIfMappingMatches(
      connection,
      null,
    );

    expect(updated?.zitadelIdpId).toBeNull();
    expect(connectionRecords.findOne).not.toHaveBeenCalled();
  });

  it('maps a legacy-domain collision to the multi-domain field', async () => {
    connectionRecords.save.mockRejectedValue({
      driverError: {
        code: '23505',
        constraint: 'UQ_f77aa036bc1422c9ce84a9a13ac',
      },
    });

    await expect(repository.save(anOrgSsoConnection())).rejects.toMatchObject({
      constructor: SsoConnectionUniqueConstraintError,
      field: 'emailDomains',
    });
  });
});
