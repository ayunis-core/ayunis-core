import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { FindAllUserSummariesByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-summaries-by-org-id/find-all-user-summaries-by-org-id.use-case';
import { FindAllUserSummariesByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-summaries-by-org-id/find-all-user-summaries-by-org-id.query';
import type { UserSummary } from 'src/iam/users/domain/user-summary';
import { GetAcademyCompletionsUseCase } from 'src/domain/academy/application/use-cases/get-academy-completions/get-academy-completions.use-case';
import { GetAcademyCompletionsQuery } from 'src/domain/academy/application/use-cases/get-academy-completions/get-academy-completions.query';
import type { AcademyCompletionView } from 'src/domain/academy/domain/academy-completion-view';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import {
  CERTIFICATE_STATUS_URGENCY,
  resolveCertificateValidityStatus,
} from 'src/iam/academy-access/application/util/certificate-validity-status';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { ListOrgCertificateStatusesQuery } from './list-org-certificate-statuses.query';

export interface OrgCertificateStatus {
  readonly userId: UUID;
  readonly name: string;
  readonly email: string;
  readonly completedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly status: CertificateValidityStatus;
}

/**
 * Every member of the org with their certificate standing, for the admin
 * overview.
 *
 * Status is derived from data owned by two modules — the org's mode here, the
 * completion dates in the academy — so it cannot be filtered or sorted in SQL
 * without a cross-module join. The status filter, urgency sort and pagination
 * therefore run in memory, which is affordable at the org sizes this product
 * serves and keeps the module boundary intact.
 *
 * Search is the exception: it reads nothing but user fields, so it narrows the
 * member list inside the users module's own query rather than loading the whole
 * org to discard most of it here.
 */
@Injectable()
export class ListOrgCertificateStatusesUseCase {
  constructor(
    @InjectPinoLogger(ListOrgCertificateStatusesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly findAllUserSummariesByOrgIdUseCase: FindAllUserSummariesByOrgIdUseCase,
    private readonly getAcademyCompletionsUseCase: GetAcademyCompletionsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    query: ListOrgCertificateStatusesQuery,
  ): Promise<Paginated<OrgCertificateStatus>> {
    this.logger.info(
      {
        orgId: query.orgId,
        status: query.status,
      },
      'Listing org certificate statuses',
    );

    const statuses = await this.buildStatuses(query);
    const matching =
      query.status === undefined
        ? statuses
        : statuses.filter((entry) => entry.status === query.status);

    return new Paginated({
      data: matching.slice(query.offset, query.offset + query.limit),
      limit: query.limit,
      offset: query.offset,
      total: matching.length,
    });
  }

  private async buildStatuses(
    query: ListOrgCertificateStatusesQuery,
  ): Promise<OrgCertificateStatus[]> {
    const settings = await this.getOrgSettingsUseCase.execute(
      new GetOrgAcademyAccessSettingsQuery(query.orgId),
    );
    // One projected query for the member list: this screen only labels people,
    // so it never loads password hashes or the rest of the row.
    const users = await this.findAllUserSummariesByOrgIdUseCase.execute(
      new FindAllUserSummariesByOrgIdQuery(query.orgId, query.search),
    );
    const completions = await this.getAcademyCompletionsUseCase.execute(
      new GetAcademyCompletionsQuery({ userIds: users.map((user) => user.id) }),
    );

    const renewalRequired =
      settings.mode === AcademyAccessMode.REQUIRED_ANNUALLY;
    const now = new Date();

    return users
      .map((user) =>
        toCertificateStatus(
          user,
          completions.get(user.id),
          renewalRequired,
          now,
        ),
      )
      .sort(compareByUrgencyThenName);
  }
}

function toCertificateStatus(
  user: UserSummary,
  completion: AcademyCompletionView | undefined,
  renewalRequired: boolean,
  now: Date,
): OrgCertificateStatus {
  const completedAt = completion?.completedAt ?? null;
  // Only an org on annual renewal has an expiry to act on; reporting one
  // elsewhere would imply a deadline that mode does not have.
  const expiresAt = renewalRequired ? (completion?.expiresAt ?? null) : null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    completedAt,
    expiresAt,
    status: resolveCertificateValidityStatus({ completedAt, expiresAt, now }),
  };
}

function compareByUrgencyThenName(
  a: OrgCertificateStatus,
  b: OrgCertificateStatus,
): number {
  const byUrgency =
    CERTIFICATE_STATUS_URGENCY[a.status] - CERTIFICATE_STATUS_URGENCY[b.status];
  return byUrgency === 0 ? a.name.localeCompare(b.name) : byUrgency;
}
