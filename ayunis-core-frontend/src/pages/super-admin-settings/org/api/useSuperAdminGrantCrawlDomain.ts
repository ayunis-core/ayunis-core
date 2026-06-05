import {
  useSuperAdminCrawlDomainsControllerGrant,
  getSuperAdminCrawlDomainsControllerListQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

const GRANT_ERROR_MAP: Record<string, string> = {
  CRAWL_DOMAIN_ALREADY_ASSIGNED: 'crawlDomains.add.errorAlreadyAssigned',
  CRAWL_DOMAIN_INVALID: 'crawlDomains.add.errorInvalid',
};

export function useSuperAdminGrantCrawlDomain(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();

  const mutation = useSuperAdminCrawlDomainsControllerGrant({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminCrawlDomainsControllerListQueryKey(orgId),
        });
        showSuccess(t('crawlDomains.add.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(t(GRANT_ERROR_MAP[code] ?? 'crawlDomains.add.error'));
        } catch {
          showError(t('crawlDomains.add.error'));
        }
      },
    },
  });

  function grantCrawlDomain(domain: string) {
    mutation.mutate({ orgId, data: { domain } });
  }

  return {
    grantCrawlDomain,
    isLoading: mutation.isPending,
  };
}
