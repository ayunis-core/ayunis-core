import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyCompletionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-completion.record';
import {
  OrgCertificateStatusesRepository,
  type OrgCertificateStatusesCriteria,
  type OrgCertificateStatusesPage,
} from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import { CERTIFICATE_STATUS_URGENCY } from 'src/iam/academy-access/application/util/certificate-validity-status';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

import { certificateExpirySql } from './org-certificate-statuses-sql';

type CountedCertificate = (OrgCertificateStatus | { userId: null }) & {
  total: string;
};

@Injectable()
export class PostgresOrgCertificateStatusesRepository extends OrgCertificateStatusesRepository {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async findAll(
    criteria: OrgCertificateStatusesCriteria,
  ): Promise<OrgCertificateStatus[]> {
    const query = this.createQuery(criteria)
      .select('certificate.*')
      .from('filtered_certificates', 'certificate');
    return this.order(query).getRawMany<OrgCertificateStatus>();
  }

  async findPage(
    criteria: OrgCertificateStatusesCriteria,
    page: OrgCertificateStatusesPage,
  ): Promise<Paginated<OrgCertificateStatus>> {
    const pageQuery = this.order(
      this.dataSource
        .createQueryBuilder()
        .select('certificate.*')
        .from('filtered_certificates', 'certificate'),
    )
      .limit(page.limit)
      .offset(page.offset);
    // The count drives the left join so even an empty/out-of-range page retains its total.
    const query = this.createQuery(criteria)
      .addCommonTableExpression(pageQuery, 'certificate_page')
      .select('certificate.*')
      .addSelect('totals.total', 'total')
      .from(
        (subquery) =>
          subquery
            .select('COUNT(*)', 'total')
            .from('filtered_certificates', 'member'),
        'totals',
      )
      .leftJoin('certificate_page', 'certificate', 'TRUE');
    const rows = await this.order(query).getRawMany<CountedCertificate>();
    return new Paginated({
      ...page,
      total: Number(rows[0]?.total ?? 0),
      data: rows.flatMap((row) => (row.userId === null ? [] : [toStatus(row)])),
    });
  }

  private createQuery(
    criteria: OrgCertificateStatusesCriteria,
  ): SelectQueryBuilder<UserRecord> {
    const filtered = this.dataSource
      .createQueryBuilder()
      .select('certificate.*')
      .from('certificate_statuses', 'certificate');
    if (criteria.status !== undefined)
      filtered.where('certificate.status = :status', {
        status: criteria.status,
      });
    return new SelectQueryBuilder<UserRecord>(this.dataSource)
      .addCommonTableExpression(this.datesQuery(criteria), 'certificate_dates')
      .addCommonTableExpression(this.statusQuery(), 'certificate_statuses')
      .addCommonTableExpression(filtered, 'filtered_certificates')
      .setParameters({
        now: criteria.now.toISOString(),
        expiringSoonUntil: criteria.expiringSoonUntil.toISOString(),
      });
  }

  private datesQuery(
    criteria: OrgCertificateStatusesCriteria,
  ): SelectQueryBuilder<UserRecord> {
    const timestampTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const query = this.dataSource
      .createQueryBuilder(UserRecord, 'member')
      .select('member.id', 'userId')
      .addSelect('member.name', 'name')
      .addSelect('member.email', 'email')
      .addSelect('completion.completedAt', 'completedAt')
      .addSelect(certificateExpirySql(timestampTimeZone), 'expiresAt')
      .leftJoin(
        AcademyCompletionRecord,
        'completion',
        'completion.userId = member.id',
      )
      .where('member.orgId = :orgId', { orgId: criteria.orgId })
      .setParameters({
        renewalRequired: criteria.renewalRequired,
        validityMonths: criteria.validityMonths,
        // pg reads timestamp-without-time-zone in the Node process's timezone.
        timestampTimeZone,
      });
    const search = criteria.search?.trim();
    if (search)
      query.andWhere(
        '(member.name ILIKE :search OR member.email ILIKE :search)',
        { search: `%${search}%` },
      );
    return query;
  }

  private statusQuery(): string {
    return `SELECT *, CASE
      WHEN "completedAt" IS NULL THEN '${CertificateValidityStatus.NOT_PASSED}'
      WHEN "expiresAt" IS NULL THEN '${CertificateValidityStatus.VALID}'
      WHEN "expiresAt" <= CAST(:now AS timestamptz) THEN '${CertificateValidityStatus.EXPIRED}'
      WHEN "expiresAt" <= CAST(:expiringSoonUntil AS timestamptz) THEN '${CertificateValidityStatus.EXPIRING_SOON}'
      ELSE '${CertificateValidityStatus.VALID}' END AS status FROM certificate_dates`;
  }

  private order<Entity extends object>(
    query: SelectQueryBuilder<Entity>,
  ): SelectQueryBuilder<Entity> {
    const cases = Object.entries(CERTIFICATE_STATUS_URGENCY)
      .map(([status, rank]) => `WHEN '${status}' THEN ${rank}`)
      .join(' ');
    return query
      .orderBy(`CASE certificate.status ${cases} END`, 'ASC')
      .addOrderBy('certificate.name COLLATE "und-x-icu"', 'ASC')
      .addOrderBy('certificate."userId"', 'ASC');
  }
}

function toStatus(row: OrgCertificateStatus): OrgCertificateStatus {
  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    completedAt: row.completedAt,
    expiresAt: row.expiresAt,
    status: row.status,
  };
}
