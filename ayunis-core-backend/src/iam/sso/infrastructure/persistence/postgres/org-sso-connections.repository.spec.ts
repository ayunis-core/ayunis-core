import type { Repository } from 'typeorm';
import {
  TEST_ORG_ID,
  anOrgSsoConnection,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { PostgresOrgSsoConnectionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/org-sso-connections.repository';
import type { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { SsoConnectionUniqueConstraintError } from 'src/iam/sso/application/ports/org-sso-connections.repository';

describe(PostgresOrgSsoConnectionsRepository.name, () => {
  let typeOrmRepository: jest.Mocked<
    Pick<Repository<OrgSsoConnectionRecord>, 'findOne' | 'save' | 'update'>
  >;
  let repository: PostgresOrgSsoConnectionsRepository;

  beforeEach(() => {
    const mapper = new OrgSsoConnectionMapper();
    const record = mapper.toRecord(anOrgSsoConnection());
    typeOrmRepository = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repository = new PostgresOrgSsoConnectionsRepository(
      typeOrmRepository as unknown as Repository<OrgSsoConnectionRecord>,
      mapper,
    );
  });

  it('queries with the canonical identifiers supplied by the application', async () => {
    await repository.findByEmailDomain(' STADT.EXAMPLE ');
    await repository.findByZitadelOrgId(' zitadel-org-1 ');

    expect(typeOrmRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { emailDomain: ' STADT.EXAMPLE ' },
    });
    expect(typeOrmRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { zitadelOrgId: ' zitadel-org-1 ' },
    });
  });

  it('updates configuration only while the connection is disabled', async () => {
    const connection = anOrgSsoConnection({
      emailDomain: 'new.example',
      zitadelOrgId: 'new-zitadel-org',
      jitProvisioningEnabled: true,
    });

    const expected = anOrgSsoConnection({
      emailDomain: 'old.example',
      zitadelOrgId: 'old-zitadel-org',
    });

    await repository.updateConfigurationIfDisabled(connection, expected);

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      {
        orgId: TEST_ORG_ID,
        emailDomain: 'old.example',
        zitadelOrgId: 'old-zitadel-org',
        enabled: false,
        jitProvisioningEnabled: false,
      },
      {
        emailDomain: 'new.example',
        domainVerifiedAt: connection.domainVerifiedAt,
        zitadelOrgId: 'new-zitadel-org',
        jitProvisioningEnabled: true,
        updatedAt: expect.any(Date),
      },
    );
  });

  it('updates only the runtime enabled field', async () => {
    const connection = anOrgSsoConnection();

    await repository.setEnabled(connection, true);

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      {
        orgId: TEST_ORG_ID,
        emailDomain: connection.emailDomain,
        zitadelOrgId: connection.zitadelOrgId,
      },
      { enabled: true, updatedAt: expect.any(Date) },
    );
  });

  it('updates only the JIT provisioning field', async () => {
    await repository.setJitProvisioningEnabled(TEST_ORG_ID, true);

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      { orgId: TEST_ORG_ID },
      { jitProvisioningEnabled: true, updatedAt: expect.any(Date) },
    );
  });

  it('updates JIT only when the expected mapping still matches', async () => {
    const expected = anOrgSsoConnection();

    await repository.setJitProvisioningEnabledIfMappingMatches(expected, true);

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      {
        orgId: TEST_ORG_ID,
        emailDomain: expected.emailDomain,
        zitadelOrgId: expected.zitadelOrgId,
      },
      { jitProvisioningEnabled: true, updatedAt: expect.any(Date) },
    );
  });

  it('does not re-read a row when a conditional update changed nothing', async () => {
    typeOrmRepository.update.mockResolvedValue({
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
    expect(typeOrmRepository.findOne).not.toHaveBeenCalled();
  });

  it('reports the violated organization constraint on concurrent insert', async () => {
    typeOrmRepository.save.mockRejectedValue({
      driverError: {
        code: '23505',
        constraint: 'REL_62c35b470ecd255934b5d600f2',
      },
    });

    await expect(repository.save(anOrgSsoConnection())).rejects.toMatchObject({
      constructor: SsoConnectionUniqueConstraintError,
      field: 'orgId',
    });
    expect(typeOrmRepository.findOne).not.toHaveBeenCalled();
  });

  it('maps a concurrent domain collision to a deterministic conflict', async () => {
    typeOrmRepository.save.mockRejectedValue({
      driverError: {
        code: '23505',
        constraint: 'UQ_f77aa036bc1422c9ce84a9a13ac',
      },
    });
    typeOrmRepository.findOne.mockResolvedValue(null);

    await expect(repository.save(anOrgSsoConnection())).rejects.toMatchObject({
      constructor: SsoConnectionUniqueConstraintError,
      field: 'emailDomain',
    });
  });

  it('maps a concurrent update collision to a deterministic conflict', async () => {
    typeOrmRepository.update.mockRejectedValue({
      code: '23505',
      constraint: 'UQ_4f11a98a3183992bf0ac0090ac2',
    });

    await expect(
      repository.updateConfigurationIfDisabled(
        anOrgSsoConnection({ zitadelOrgId: 'changed-zitadel-org' }),
        anOrgSsoConnection(),
      ),
    ).rejects.toMatchObject({
      constructor: SsoConnectionUniqueConstraintError,
      field: 'zitadelOrgId',
    });
  });
});
