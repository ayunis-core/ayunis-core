import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { UsersSearchWidget } from '@/widgets/users-search/ui/UsersSearchWidget';
import type {
  AcademyAccessMode,
  CertificateValidityStatus,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  ALL_STATUSES_FILTER_VALUE,
  certificateStatusOptions,
} from '../model/statuses';

interface CertificateOverviewFiltersProps {
  search?: string;
  status?: CertificateValidityStatus;
  /** Decides which statuses are offered: two of them only exist under annual renewal. */
  mode: AcademyAccessMode;
}

/**
 * Search and status filter, both held in the URL so an admin can share or
 * bookmark "everyone whose certificate has expired".
 */
export function CertificateOverviewFilters({
  search,
  status,
  mode,
}: Readonly<CertificateOverviewFiltersProps>) {
  const { t } = useTranslation('admin-settings-academy');
  const navigate = useNavigate();

  // Any filter change invalidates the current page number, so it resets.
  const applySearch = useCallback(
    (newSearch?: string) => {
      void navigate({
        to: '/admin-settings/academy',
        search: (prev) => ({ ...prev, search: newSearch, page: undefined }),
      });
    },
    [navigate],
  );

  const applyStatus = useCallback(
    (value: string) => {
      void navigate({
        to: '/admin-settings/academy',
        search: (prev) => ({
          ...prev,
          status:
            value === ALL_STATUSES_FILTER_VALUE
              ? undefined
              : (value as CertificateValidityStatus),
          page: undefined,
        }),
      });
    },
    [navigate],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <UsersSearchWidget
        search={search}
        onSearchChange={applySearch}
        translationNamespace="admin-settings-academy"
        placeholderKey="overview.searchPlaceholder"
        autoFocus={false}
      />
      {/* The width lives on the wrapper so the trigger keeps its own sizing. */}
      <div className="w-56">
        <Select
          value={status ?? ALL_STATUSES_FILTER_VALUE}
          onValueChange={applyStatus}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES_FILTER_VALUE}>
              {t('overview.filter.all')}
            </SelectItem>
            {certificateStatusOptions(mode).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
