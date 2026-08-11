import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { type FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { SsoConnectionConflictError } from 'src/iam/sso/application/sso.errors';
import {
  normalizeEmailDomain,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';

const PG_UNIQUE_VIOLATION = '23505';
const UNIQUE_CONSTRAINT_FIELDS = {
  UQ_f77aa036bc1422c9ce84a9a13ac: 'emailDomain',
  UQ_4f11a98a3183992bf0ac0090ac2: 'zitadelOrgId',
  REL_62c35b470ecd255934b5d600f2: 'orgId',
} as const;

type UniqueConnectionField =
  (typeof UNIQUE_CONSTRAINT_FIELDS)[keyof typeof UNIQUE_CONSTRAINT_FIELDS];

function uniqueConnectionField(error: unknown): UniqueConnectionField | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  const code = driverError?.code ?? record.code;
  const constraint = driverError?.constraint ?? record.constraint;
  if (code !== PG_UNIQUE_VIOLATION || typeof constraint !== 'string') {
    return null;
  }
  if (!(constraint in UNIQUE_CONSTRAINT_FIELDS)) {
    return null;
  }
  return UNIQUE_CONSTRAINT_FIELDS[
    constraint as keyof typeof UNIQUE_CONSTRAINT_FIELDS
  ];
}

@Injectable()
export class PostgresOrgSsoConnectionsRepository extends OrgSsoConnectionsRepository {
  constructor(
    @InjectRepository(OrgSsoConnectionRecord)
    private readonly repository: Repository<OrgSsoConnectionRecord>,
    private readonly mapper: OrgSsoConnectionMapper,
  ) {
    super();
  }

  findByOrgId(orgId: UUID): Promise<OrgSsoConnection | null> {
    return this.findOne({ orgId });
  }

  findByEmailDomain(emailDomain: string): Promise<OrgSsoConnection | null> {
    return this.findOne({ emailDomain: normalizeEmailDomain(emailDomain) });
  }

  findByZitadelOrgId(zitadelOrgId: string): Promise<OrgSsoConnection | null> {
    return this.findOne({ zitadelOrgId: normalizeZitadelOrgId(zitadelOrgId) });
  }

  async save(connection: OrgSsoConnection): Promise<OrgSsoConnection> {
    try {
      const record = await this.repository.save(
        this.mapper.toRecord(connection),
      );
      return this.mapper.toDomain(record);
    } catch (error: unknown) {
      const field = uniqueConnectionField(error);
      if (!field) {
        throw error;
      }
      const existing = await this.findByOrgId(connection.orgId);
      if (existing && this.sameConfiguration(existing, connection)) {
        return existing;
      }
      throw new SsoConnectionConflictError(field);
    }
  }

  async updateConfigurationIfDisabled(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null> {
    try {
      const result = await this.repository.update(
        {
          orgId: connection.orgId,
          emailDomain: expected.emailDomain,
          zitadelOrgId: expected.zitadelOrgId ?? IsNull(),
          enabled: false,
          jitProvisioningEnabled: expected.jitProvisioningEnabled,
        },
        {
          emailDomain: connection.emailDomain,
          domainVerifiedAt: connection.domainVerifiedAt,
          zitadelOrgId: connection.zitadelOrgId,
          jitProvisioningEnabled: connection.jitProvisioningEnabled,
        },
      );
      return result.affected ? this.findByOrgId(connection.orgId) : null;
    } catch (error: unknown) {
      const field = uniqueConnectionField(error);
      if (!field) {
        throw error;
      }
      throw new SsoConnectionConflictError(field);
    }
  }

  async setEnabled(
    connection: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null> {
    const result = await this.repository.update(
      {
        orgId: connection.orgId,
        emailDomain: connection.emailDomain,
        zitadelOrgId: connection.zitadelOrgId ?? IsNull(),
      },
      { enabled },
    );
    return result.affected ? this.findByOrgId(connection.orgId) : null;
  }

  async setJitProvisioningEnabled(
    orgId: UUID,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null> {
    const result = await this.repository.update(
      { orgId },
      { jitProvisioningEnabled: enabled },
    );
    return result.affected ? this.findByOrgId(orgId) : null;
  }

  async setJitProvisioningEnabledIfMappingMatches(
    expected: OrgSsoConnection,
    enabled: boolean,
  ): Promise<OrgSsoConnection | null> {
    const result = await this.repository.update(
      {
        orgId: expected.orgId,
        emailDomain: expected.emailDomain,
        zitadelOrgId: expected.zitadelOrgId ?? IsNull(),
      },
      { jitProvisioningEnabled: enabled },
    );
    return result.affected ? this.findByOrgId(expected.orgId) : null;
  }

  private async findOne(
    where: FindOptionsWhere<OrgSsoConnectionRecord>,
  ): Promise<OrgSsoConnection | null> {
    const record = await this.repository.findOne({ where });
    return record ? this.mapper.toDomain(record) : null;
  }

  private sameConfiguration(
    left: OrgSsoConnection,
    right: OrgSsoConnection,
  ): boolean {
    return (
      left.emailDomain === right.emailDomain &&
      left.zitadelOrgId === right.zitadelOrgId &&
      left.jitProvisioningEnabled === right.jitProvisioningEnabled
    );
  }
}
