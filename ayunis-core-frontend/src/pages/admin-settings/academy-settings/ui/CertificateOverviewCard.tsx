import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { SearchPagination } from '@/widgets/pagination';
import type {
  CertificateValidityStatus,
  OrgCertificateStatusResponseDto,
  PaginationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useDownloadMemberCertificate } from '@/pages/admin-settings/academy-settings/api/useDownloadMemberCertificate';
import { useExportCertificateOverview } from '@/pages/admin-settings/academy-settings/api/useExportCertificateOverview';
import { CertificateOverviewFilters } from './CertificateOverviewFilters';
import { CertificateOverviewTable } from './CertificateOverviewTable';

interface CertificateOverviewCardProps {
  entries: OrgCertificateStatusResponseDto[];
  pagination: PaginationDto;
  mode: AcademyAccessMode;
  currentPage: number;
  search?: string;
  status?: CertificateValidityStatus;
}

export function CertificateOverviewCard({
  entries,
  pagination,
  mode,
  currentPage,
  search,
  status,
}: Readonly<CertificateOverviewCardProps>) {
  const { t } = useTranslation('admin-settings-academy');
  const totalPages = Math.ceil((pagination.total ?? 0) / pagination.limit);
  const { exportOverview, isExporting } = useExportCertificateOverview({
    search,
    status,
  });
  const { downloadCertificate, downloadingUserId } =
    useDownloadMemberCertificate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overview.title')}</CardTitle>
        <CardDescription>{t('overview.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CertificateOverviewFilters
            search={search}
            status={status}
            mode={mode}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void exportOverview()}
            disabled={isExporting || (pagination.total ?? 0) === 0}
            data-testid="academy-overview-export"
          >
            <Download />
            {isExporting
              ? t('overview.export.loading')
              : t('overview.export.button')}
          </Button>
        </div>
        <CertificateOverviewTable
          entries={entries}
          showRenewalColumn={mode === AcademyAccessMode.required_annually}
          onDownloadCertificate={(userId) => void downloadCertificate(userId)}
          downloadingUserId={downloadingUserId}
        />
        {totalPages > 1 && (
          <SearchPagination
            currentPage={currentPage}
            totalPages={totalPages}
            to="/admin-settings/academy"
            search={search}
            extraSearchParams={{ status }}
          />
        )}
      </CardContent>
    </Card>
  );
}
