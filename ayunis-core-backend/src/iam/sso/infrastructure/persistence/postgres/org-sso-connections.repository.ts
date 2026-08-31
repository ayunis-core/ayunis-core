import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import {
  IsNull,
  type FindOptionsWhere,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import {
  OrgSsoConnectionsRepository,
  SsoConnectionUniqueConstraintError,
  type OrgSsoConnectionDomainState,
  type SsoConnectionUniqueField,
} from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { OrgSsoEmailDomainRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-email-domain.record';

const PG_UNIQUE_VIOLATION = '23505';
const UNIQUE_CONSTRAINT_FIELDS = {
  UQ_f77aa036bc1422c9ce84a9a13ac: 'emailDomains',
  UQ_3e9920e89c432ea23f504c4b0c8: 'emailDomains',
  UQ_4f11a98a3183992bf0ac0090ac2: 'zitadelOrgId',
  REL_62c35b470ecd255934b5d600f2: 'orgId',
} as const;

function uniqueConnectionField(
  error: unknown,
): SsoConnectionUniqueField | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  const code = driverError?.code ?? record.code;
  const constraint = driverError?.constraint ?? record.constraint;
  if (code !== PG_UNIQUE_VIOLATION || typeof constraint !== 'string') {
    return null;
  }
  if (!(constraint in UNIQUE_CONSTRAINT_FIELDS)) return null;
  return UNIQUE_CONSTRAINT_FIELDS[
    constraint as keyof typeof UNIQUE_CONSTRAINT_FIELDS
  ];
}

@Injectable()
export class PostgresOrgSsoConnectionsRepository extends OrgSsoConnectionsRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly mapper: OrgSsoConnectionMapper,
  ) {
    super();
  }

  async acquireMutationLock(orgId: UUID): Promise<boolean> {
    const record = await this.records.findOne({
      where: { orgId },
      select: { id: true },
      lock: { mode: 'pessimistic_write' },
    });
    return record !== null;
  }

  findByOrgId(orgId: UUID): Promise<OrgSsoConnection | null> {
    return this.findOne({ orgId });
  }

  async findLocalPasswordLoginEnabledByOrgId(
    orgId: UUID,
  ): Promise<boolean | null> {
    return this.findLocalPasswordLoginEnabled(orgId);
  }

  async findLocalPasswordLoginEnabledByOrgIdForSessionIssuance(
    orgId: UUID,
  ): Promise<boolean | null> {
    return this.findLocalPasswordLoginEnabled(orgId, true);
  }

  private async findLocalPasswordLoginEnabled(
    orgId: UUID,
    lockForSessionIssuance = false,
  ): Promise<boolean | null> {
    const options = {
      where: { orgId },
      select: { localPasswordLoginEnabled: true },
    };
    const record = lockForSessionIssuance
      ? await this.records.findOne({
          ...options,
          lock: { mode: 'pessimistic_read' },
        })
      : await this.records.findOne(options);
    return record?.localPasswordLoginEnabled ?? null;
  }

  async findByOrgIdWithDomainState(
    orgId: UUID,
  ): Promise<OrgSsoConnectionDomainState | null> {
    const record = await this.findRecord({ orgId });
    if (!record) return null;
    return {
      connection: this.mapper.toDomain(record),
      hasCanonicalEmailDomains: record.emailDomains.length > 0,
    };
  }

  async findByEmailDomain(
    emailDomain: string,
  ): Promise<OrgSsoConnection | null> {
    const record = await this.routingQuery()
      .where(this.domainExistsClause('= :emailDomain'), { emailDomain })
      .getOne();
    return record ? this.mapper.toDomain(record) : null;
  }

  async findOwnerOrgIdsByEmailDomains(emailDomains: string[]): Promise<UUID[]> {
    if (emailDomains.length === 0) return [];
    const records = await this.records
      .createQueryBuilder('connection')
      .select('connection.orgId', 'orgId')
      .where(this.domainExistsClause('IN (:...emailDomains)'), {
        emailDomains,
      })
      .getRawMany<{ orgId: UUID }>();
    return records.map(({ orgId }) => orgId);
  }

  async save(connection: OrgSsoConnection): Promise<OrgSsoConnection> {
    try {
      const record = await this.records.save(this.mapper.toRecord(connection));
      return this.mapper.toDomain(record);
    } catch (error: unknown) {
      this.throwUniqueConstraint(error);
      throw error;
    }
  }

  async updateConfigurationIfDisabled(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null> {
    try {
      const updatedAt = new Date();
      const result = await this.records.update(
        {
          orgId: connection.orgId,
          emailDomain: expected.emailDomain,
          zitadelOrgId: expected.zitadelOrgId ?? IsNull(),
          zitadelIdpId: expected.zitadelIdpId ?? IsNull(),
          enabled: false,
          updatedAt: expected.updatedAt,
        },
        {
          emailDomain: connection.emailDomain,
          domainVerifiedAt: connection.domainVerifiedAt,
          zitadelOrgId: connection.zitadelOrgId,
          zitadelIdpId: connection.zitadelIdpId,
          updatedAt,
        },
      );
      if (!result.affected) return null;
      await this.replaceDomains(connection);
      return this.copyConnection(connection, { updatedAt });
    } catch (error: unknown) {
      this.throwUniqueConstraint(error);
      throw error;
    }
  }

  async setEnabled(
    connection: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null> {
    const updatedAt = new Date();
    const result = await this.records.update(
      { orgId: connection.orgId, updatedAt: connection.updatedAt },
      { enabled, updatedAt },
    );
    return result.affected
      ? this.copyConnection(connection, { enabled, updatedAt })
      : null;
  }

  async setJitProvisioningEnabledIfMappingMatches(
    expected: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null> {
    const updatedAt = new Date();
    const result = await this.records.update(
      { orgId: expected.orgId, updatedAt: expected.updatedAt },
      { jitProvisioningEnabled: enabled, updatedAt },
    );
    return result.affected
      ? this.copyConnection(expected, {
          jitProvisioningEnabled: enabled,
          updatedAt,
        })
      : null;
  }

  async setLocalPasswordLoginEnabledIfMappingMatches(
    expected: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null> {
    const updatedAt = new Date();
    const result = await this.records.update(
      { orgId: expected.orgId, updatedAt: expected.updatedAt },
      { localPasswordLoginEnabled: enabled, updatedAt },
    );
    return result.affected
      ? this.copyConnection(expected, {
          localPasswordLoginEnabled: enabled,
          updatedAt,
        })
      : null;
  }

  async setZitadelIdpIdIfMappingMatches(
    expected: OrgSsoConnection,
    zitadelIdpId: string | null,
  ): Promise<OrgSsoConnection | null> {
    const updatedAt = new Date();
    const result = await this.records.update(
      { orgId: expected.orgId, updatedAt: expected.updatedAt },
      { zitadelIdpId, updatedAt },
    );
    return result.affected
      ? this.copyConnection(expected, { zitadelIdpId, updatedAt })
      : null;
  }

  private get records(): Repository<OrgSsoConnectionRecord> {
    return this.txHost.tx.getRepository(OrgSsoConnectionRecord);
  }

  private get domainRecords(): Repository<OrgSsoEmailDomainRecord> {
    return this.txHost.tx.getRepository(OrgSsoEmailDomainRecord);
  }

  private routingQuery(): SelectQueryBuilder<OrgSsoConnectionRecord> {
    return this.records
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.emailDomains', 'emailDomains');
  }

  private domainExistsClause(comparison: string): string {
    return `EXISTS (
      SELECT 1 FROM "org_sso_email_domains" "matchingDomain"
      WHERE "matchingDomain"."orgSsoConnectionId" = "connection"."id"
      AND "matchingDomain"."emailDomain" ${comparison}
    )`;
  }

  private async replaceDomains(connection: OrgSsoConnection): Promise<void> {
    await this.domainRecords.delete({ orgSsoConnectionId: connection.id });
    await this.domainRecords.insert(
      this.mapper.toRecord(connection).emailDomains,
    );
  }

  private copyConnection(
    connection: OrgSsoConnection,
    changes: Partial<
      Pick<
        OrgSsoConnection,
        | 'enabled'
        | 'jitProvisioningEnabled'
        | 'localPasswordLoginEnabled'
        | 'zitadelIdpId'
        | 'updatedAt'
      >
    >,
  ): OrgSsoConnection {
    return new OrgSsoConnection({ ...connection, ...changes });
  }

  private async findOne(
    where: FindOptionsWhere<OrgSsoConnectionRecord>,
  ): Promise<OrgSsoConnection | null> {
    const record = await this.findRecord(where);
    return record ? this.mapper.toDomain(record) : null;
  }

  private findRecord(
    where: FindOptionsWhere<OrgSsoConnectionRecord>,
  ): Promise<OrgSsoConnectionRecord | null> {
    return this.records.findOne({
      where,
      relations: { emailDomains: true },
    });
  }

  private throwUniqueConstraint(error: unknown): void {
    const field = uniqueConnectionField(error);
    if (field) throw new SsoConnectionUniqueConstraintError(field);
  }
}
