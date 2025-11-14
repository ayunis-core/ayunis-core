import {
  getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey,
  useSuperAdminTrialsControllerUpdateTrial,
} from '@/shared/api';
import type { SuperAdminTrialResponseDto } from '@/shared/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseSuperAdminTrialUpdateProps {
  orgId: string;
  trial: SuperAdminTrialResponseDto;
}

export default function useSuperAdminTrialUpdate({
  orgId,
  trial,
}: UseSuperAdminTrialUpdateProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        maxMessages: z.coerce
          .number()
          .min(1, t('trial.updateErrorMaxMessagesRequired')),
        messagesSent: z.coerce
          .number()
          .min(0, t('trial.updateErrorMessagesSentRequired')),
      }),
    ),
    defaultValues: {
      maxMessages: trial.maxMessages,
      messagesSent: trial.messagesSent,
    },
  });

  useEffect(() => {
    form.reset({
      maxMessages: trial.maxMessages,
      messagesSent: trial.messagesSent,
    });
  }, [trial, form]);

  const { mutate: updateTrial, isPending } =
    useSuperAdminTrialsControllerUpdateTrial({
      mutation: {
        onSuccess: (updatedTrial) => {
          form.reset({
            maxMessages: updatedTrial.maxMessages,
            messagesSent: updatedTrial.messagesSent,
          });
          showSuccess(t('trial.updateSuccess'));
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'TRIAL_NOT_FOUND':
              showError(t('trial.updateErrorNotFound'));
              break;
            case 'TRIAL_CAPACITY_EXCEEDED':
              showError(t('trial.updateErrorCapacityExceeded'));
              break;
            case 'TRIAL_UPDATE_FAILED':
              showError(t('trial.updateErrorUnexpected'));
              break;
            default:
              showError(t('trial.updateErrorUnexpected'));
          }
        },
        onSettled: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey(orgId),
          });
          void router.invalidate();
        },
      },
    });

  const handleSubmit = form.handleSubmit(({ maxMessages, messagesSent }) => {
    updateTrial({
      orgId,
      data: {
        maxMessages,
        messagesSent,
      },
    });
  });

  return { form, handleSubmit, isPending };
}
