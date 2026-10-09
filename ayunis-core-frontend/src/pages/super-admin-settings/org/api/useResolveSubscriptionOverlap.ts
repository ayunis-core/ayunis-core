import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useSuperAdminSubscriptionOverlapControllerResolveSubscriptionOverlap,
  type ResolveSubscriptionOverlapDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { ResolveSubscriptionOverlapFormData } from '@/pages/super-admin-settings/org/model/types';
import { invalidateOrgSubscriptionQueries } from './invalidateOrgSubscriptionQueries';

interface UseResolveSubscriptionOverlapParams {
  orgId: string;
  form: UseFormReturn<ResolveSubscriptionOverlapFormData>;
  onSuccess: () => void;
}

export function useResolveSubscriptionOverlap({
  orgId,
  form,
  onSuccess,
}: UseResolveSubscriptionOverlapParams) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminSubscriptionOverlapControllerResolveSubscriptionOverlap({
      mutation: {
        onSuccess: () => {
          invalidateOrgSubscriptionQueries(queryClient, router, orgId);
          showSuccess(t('subscriptionOverlap.success'));
          onSuccess();
        },
        onError: (error) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(
                form,
                errors,
                t,
                'subscriptionOverlap.validation',
              );
              showError(t('subscriptionOverlap.validation.invalid'));
              return;
            }
            switch (code) {
              case 'INVALID_SUBSCRIPTION_DATA':
                showError(t('subscriptionOverlap.invalidCorrection'));
                break;
              case 'UNAUTHORIZED_SUBSCRIPTION_ACCESS':
                showError(t('subscriptionOverlap.unauthorized'));
                break;
              default:
                showError(t('subscriptionOverlap.error'));
            }
          } catch {
            showError(t('subscriptionOverlap.error'));
          }
        },
      },
    });

  return {
    resolveOverlap: (data: ResolveSubscriptionOverlapDto) =>
      mutation.mutate({ orgId, data }),
    isResolving: mutation.isPending,
  };
}
