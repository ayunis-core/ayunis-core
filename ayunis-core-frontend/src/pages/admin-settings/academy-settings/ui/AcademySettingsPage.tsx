import { useTranslation } from 'react-i18next';
import type {
  AcademyAccessMode,
  CertificateValidityStatus,
  OrgCertificateStatusResponseDto,
  PaginationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import SettingsLayout from '../../admin-settings-layout';
import { AcademyRequirementCard } from './AcademyRequirementCard';
import { CertificateOverviewCard } from './CertificateOverviewCard';

interface AcademySettingsPageProps {
  certificates: OrgCertificateStatusResponseDto[];
  pagination: PaginationDto;
  /** From the loader, so it describes the same snapshot as the rows. */
  mode: AcademyAccessMode;
  currentPage: number;
  search?: string;
  status?: CertificateValidityStatus;
}

export function AcademySettingsPage({
  certificates,
  pagination,
  mode,
  currentPage,
  search,
  status,
}: Readonly<AcademySettingsPageProps>) {
  const { t: tLayout } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={tLayout('layout.academy')}>
      <div className="space-y-4">
        <AcademyRequirementCard />
        <CertificateOverviewCard
          entries={certificates}
          pagination={pagination}
          mode={mode}
          currentPage={currentPage}
          search={search}
          status={status}
        />
      </div>
    </SettingsLayout>
  );
}
