import { OmitType } from '@nestjs/swagger';
import { OrgCertificateStatusesQueryParamsDto } from './org-certificate-statuses-query-params.dto';

/** The export covers the whole filtered list, so it takes the filters but no page. */
export class OrgCertificateStatusesExportQueryParamsDto extends OmitType(
  OrgCertificateStatusesQueryParamsDto,
  ['limit', 'offset'] as const,
) {}
