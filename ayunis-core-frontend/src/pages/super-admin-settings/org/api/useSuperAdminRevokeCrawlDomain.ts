import {
  useSuperAdminCrawlDomainsControllerRevoke,
  getSuperAdminCrawlDomainsControllerListQueryKey,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function useSuperAdminRevokeCrawlDomain(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();

  const mutation = useSuperAdminCrawlDomainsControllerRevoke({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminCrawlDomainsControllerListQueryKey(orgId),
        });
        showSuccess(t('crawlDomains.remove.success'));
      },
      onError: () => {
        showError(t('crawlDomains.remove.error'));
      },
    },
  });

  function revokeCrawlDomain(grantId: string, domain: string) {
    confirm({
      title: t('crawlDomains.remove.title'),
      description: t('crawlDomains.remove.description', { domain }),
      confirmText: t('crawlDomains.remove.confirmText'),
      cancelText: t('crawlDomains.remove.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        mutation.mutate({ orgId, grantId });
      },
    });
  }

  return {
    revokeCrawlDomain,
    isLoading: mutation.isPending,
  };
}
