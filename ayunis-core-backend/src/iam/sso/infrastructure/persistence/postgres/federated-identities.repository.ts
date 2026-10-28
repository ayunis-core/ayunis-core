import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import {
  FederatedIdentitiesRepository,
  FederatedIdentityAlreadyExistsError,
} from 'src/iam/sso/application/ports/federated-identities.repository';
import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';
import { FederatedIdentityMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/federated-identity.mapper';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';

@Injectable()
export class PostgresFederatedIdentitiesRepository extends FederatedIdentitiesRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly mapper: FederatedIdentityMapper,
  ) {
    super();
  }

  private get records(): Repository<FederatedIdentityRecord> {
    return this.txHost.tx.getRepository(FederatedIdentityRecord);
  }

  async findByIssuerAndSubject(
    issuer: string,
    subject: string,
  ): Promise<FederatedIdentity | null> {
    const record = await this.records.findOne({ where: { issuer, subject } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async create(identity: FederatedIdentity): Promise<FederatedIdentity> {
    try {
      const record = await this.records.save(this.mapper.toRecord(identity));
      return this.mapper.toDomain(record);
    } catch (error: unknown) {
      if (isIdentityUniqueViolation(error)) {
        throw new FederatedIdentityAlreadyExistsError();
      }
      throw error;
    }
  }
}

function isIdentityUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const value = error as Record<string, unknown>;
  const driver = value.driverError as Record<string, unknown> | undefined;
  return (
    (driver?.code ?? value.code) === '23505' &&
    (driver?.constraint ?? value.constraint) ===
      'UQ_c9ea7918683e4d47f6e16d5fd33'
  );
}
