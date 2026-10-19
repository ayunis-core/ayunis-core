import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { convertCSVToString } from 'src/common/util/csv';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import { OrgCertificateStatusesService } from 'src/iam/academy-access/application/services/org-certificate-statuses.service';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { ExportOrgCertificateStatusesQuery } from './export-org-certificate-statuses.query';

export const CERTIFICATE_OVERVIEW_EXPORT_FILE_NAME =
  'Schulungsstatus_Ayunis_Core_KI-Schulung.csv';

const CSV_HEADERS = [
  'Name',
  'E-Mail',
  'Status',
  'Zuletzt abgeschlossen',
  'Erneuerung fällig',
];

/**
 * A `Record` over the enum so a new status is a compile error here rather than
 * an empty cell in a personnel file.
 */
const STATUS_LABELS: Record<CertificateValidityStatus, string> = {
  [CertificateValidityStatus.VALID]: 'Gültig',
  [CertificateValidityStatus.EXPIRING_SOON]: 'Läuft bald ab',
  [CertificateValidityStatus.EXPIRED]: 'Abgelaufen',
  [CertificateValidityStatus.NOT_PASSED]: 'Noch nicht abgeschlossen',
};

// Same calendar as the date printed on the certificate PDF, so the file and the
// confirmation it accompanies never disagree on the day.
const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * The admin overview as a CSV file: the whole filtered member list, not one
 * page of it, in the overview's order.
 */
@Injectable()
export class ExportOrgCertificateStatusesUseCase {
  private readonly logger = new Logger(
    ExportOrgCertificateStatusesUseCase.name,
  );

  constructor(
    private readonly statusesService: OrgCertificateStatusesService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(query: ExportOrgCertificateStatusesQuery): Promise<string> {
    this.logger.log(
      { orgId: query.orgId, status: query.status },
      'Exporting org certificate statuses',
    );

    const statuses = await this.statusesService.findAll({
      orgId: query.orgId,
      search: query.search,
      status: query.status,
    });

    const csv = convertCSVToString(
      {
        headers: CSV_HEADERS,
        rows: statuses.map(toCsvRow),
      },
      { escapeFormulae: true },
    );
    // Windows Excel uses the BOM to recognize UTF-8 member names and labels.
    return '\uFEFF' + csv;
  }
}

function toCsvRow(entry: OrgCertificateStatus): string[] {
  return [
    entry.name,
    entry.email,
    STATUS_LABELS[entry.status],
    formatDate(entry.completedAt),
    formatDate(entry.expiresAt),
  ];
}

function formatDate(date: Date | null): string {
  return date === null ? '' : DATE_FORMAT.format(date);
}
