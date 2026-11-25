import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In, type Repository } from 'typeorm';
import type { UUID } from 'crypto';
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

  existsByUserIdAndIssuer(userId: UUID, issuer: string): Promise<boolean> {
    return this.records.existsBy({ userId, issuer });
  }

  async findSubjectsByUserId(userId: UUID, issuer: string): Promise<string[]> {
    const records = await this.records.find({
      select: { subject: true },
      where: { userId, issuer },
    });
    return records.map((record) => record.subject);
  }

  async findSubjectsByOrgId(orgId: UUID, issuer: string): Promise<string[]> {
    const rows = await this.records
      .createQueryBuilder('identity')
      .innerJoin('identity.user', 'user')
      .select('identity.subject', 'subject')
      .where('identity.issuer = :issuer', { issuer })
      .andWhere('user.orgId = :orgId', { orgId })
      .getRawMany<{ subject: string }>();
    return rows.map((row) => row.subject);
  }

  async findLinkedSubjects(
    issuer: string,
    subjects: string[],
  ): Promise<string[]> {
    if (subjects.length === 0) return [];
    const records = await this.records.find({
      select: { subject: true },
      where: { issuer, subject: In(subjects) },
    });
    return records.map((record) => record.subject);
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
