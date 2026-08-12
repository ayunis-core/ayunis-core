import { useTranslation } from 'react-i18next';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overview.title')}</CardTitle>
        <CardDescription>{t('overview.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CertificateOverviewFilters
          search={search}
          status={status}
          mode={mode}
        />
        <CertificateOverviewTable
          entries={entries}
          showRenewalColumn={mode === AcademyAccessMode.required_annually}
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
