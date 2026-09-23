import {
  getInvitesControllerGetInvitesQueryKey,
  getSuperAdminInvitesControllerGetInvitesQueryKey,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  useInvitesControllerCreateBulk,
  useSuperAdminInvitesControllerCreateBulk,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  CreateBulkInviteItemDto,
  CreateBulkInvitesResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useBulkInviteCreate(
  orgId?: string,
  onSuccess?: (response: CreateBulkInvitesResponseDto) => void,
  onError?: (errors: BulkInviteValidationError[]) => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');

  const mutationOptions = {
    onSuccess: (response: CreateBulkInvitesResponseDto) => {
      if (response.failureCount === 0) {
        showSuccess(
          t('bulkInvite.allSuccess', { count: response.successCount }),
        );
      } else if (response.successCount > 0) {
        showSuccess(
          t('bulkInvite.partialSuccess', {
            success: response.successCount,
            total: response.totalCount,
          }),
        );
      }
      onSuccess?.(response);
    },
    onError: (error: unknown) => {
      try {
        const { code, metadata } = extractErrorData(error);
        if (code === 'BULK_INVITE_VALIDATION_FAILED') {
          showError(t('bulkInvite.validationFailed'));
          onError?.(validationErrorsFrom(metadata));
        } else {
          showError(t('bulkInvite.error'));
          onError?.([]);
        }
      } catch {
        showError(t('bulkInvite.error'));
        onError?.([]);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getInvitesControllerGetInvitesQueryKey(),
      });
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminInvitesControllerGetInvitesQueryKey(orgId),
        });
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(orgId),
        });
      }
      void router.invalidate();
    },
  };

  const adminMutation = useInvitesControllerCreateBulk({
    mutation: mutationOptions,
  });
  const superAdminMutation = useSuperAdminInvitesControllerCreateBulk({
    mutation: mutationOptions,
  });

  function createBulkInvites(invites: CreateBulkInviteItemDto[]): void {
    const data = { invites };
    if (orgId) {
      superAdminMutation.mutate({ orgId, data });
      return;
    }
    adminMutation.mutate({ data });
  }

  const activeMutation = orgId ? superAdminMutation : adminMutation;

  return {
    createBulkInvites,
    isLoading: activeMutation.isPending,
    isError: activeMutation.isError,
    error: activeMutation.error,
  };
}

export interface BulkInviteValidationError {
  row: number;
  email: string;
  errorCode: string;
  message: string;
}

function validationErrorsFrom(
  metadata: Record<string, unknown> | undefined,
): BulkInviteValidationError[] {
  const errors = metadata?.errors;
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.filter(isBulkInviteValidationError);
}

function isBulkInviteValidationError(
  value: unknown,
): value is BulkInviteValidationError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<BulkInviteValidationError>;
  return (
    typeof candidate.row === 'number' &&
    typeof candidate.email === 'string' &&
    typeof candidate.errorCode === 'string' &&
    typeof candidate.message === 'string'
  );
}
