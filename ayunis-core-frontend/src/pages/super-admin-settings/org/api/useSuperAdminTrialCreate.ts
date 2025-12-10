import {
  getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey,
  useSuperAdminTrialsControllerCreateTrial,
} from '@/shared/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

interface UseSuperAdminTrialCreateProps {
  orgId: string;
}

export default function useSuperAdminTrialCreate({
  orgId,
}: UseSuperAdminTrialCreateProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        maxMessages: z.coerce
          .number()
          .min(1, t('trial.createErrorMaxMessagesRequired')),
      }),
    ),
    defaultValues: {
      maxMessages: 1000,
    },
  });

  const { mutate: createTrial } = useSuperAdminTrialsControllerCreateTrial({
    mutation: {
      onSuccess: () => {
        form.reset();
        showSuccess(t('trial.createSuccess'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'TRIAL_ALREADY_EXISTS':
              showError(t('trial.createErrorAlreadyExists'));
              break;
            case 'TRIAL_CAPACITY_EXCEEDED':
              showError(t('trial.createErrorCapacityExceeded'));
              break;
            default:
              showError(t('trial.createErrorUnexpected'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('trial.createErrorUnexpected'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey(orgId),
        });
        void router.invalidate();
      },
    },
  });

  const handleSubmit = form.handleSubmit(({ maxMessages }) => {
    createTrial({
      data: {
        orgId,
        maxMessages,
      },
    });
  });

  return { form, handleSubmit };
}
