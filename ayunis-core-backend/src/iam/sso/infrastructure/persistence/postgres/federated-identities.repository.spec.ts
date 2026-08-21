import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { FederatedIdentityMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/federated-identity.mapper';
import { PostgresFederatedIdentitiesRepository } from 'src/iam/sso/infrastructure/persistence/postgres/federated-identities.repository';
import type { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';
import {
  aFederatedIdentity,
  SSO_TEST_ISSUER,
  SSO_TEST_SUBJECT,
} from 'src/iam/sso/application/testing/sso-provisioning.fixtures';
import { FederatedIdentityAlreadyExistsError } from 'src/iam/sso/application/ports/federated-identities.repository';

describe(PostgresFederatedIdentitiesRepository.name, () => {
  let records: jest.Mocked<
    Pick<Repository<FederatedIdentityRecord>, 'findOne' | 'save'>
  >;
  let repository: PostgresFederatedIdentitiesRepository;

  beforeEach(() => {
    const mapper = new FederatedIdentityMapper();
    const record = mapper.toRecord(aFederatedIdentity());
    records = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockImplementation(async (saved) => saved),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(records),
    } as unknown as EntityManager;
    const txHost = {
      get tx() {
        return manager;
      },
    } as TransactionHost<TransactionalAdapterTypeOrm>;
    repository = new PostgresFederatedIdentitiesRepository(txHost, mapper);
  });

  it('finds only an exact validated issuer and subject pair', async () => {
    await repository.findByIssuerAndSubject(SSO_TEST_ISSUER, SSO_TEST_SUBJECT);

    expect(records.findOne).toHaveBeenCalledWith({
      where: { issuer: SSO_TEST_ISSUER, subject: SSO_TEST_SUBJECT },
    });
  });

  it('persists through the ambient transaction manager', async () => {
    const identity = aFederatedIdentity();

    await expect(repository.create(identity)).resolves.toMatchObject(identity);
    expect(records.save).toHaveBeenCalledWith(
      expect.objectContaining(identity),
    );
  });

  it('reports a concurrent duplicate identity deterministically', async () => {
    records.save.mockRejectedValue({
      code: '23505',
      constraint: 'UQ_c9ea7918683e4d47f6e16d5fd33',
    });

    await expect(
      repository.create(aFederatedIdentity()),
    ).rejects.toBeInstanceOf(FederatedIdentityAlreadyExistsError);
  });
});
