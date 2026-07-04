import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useMfaControllerGetStatus,
  useMfaControllerSetup,
  useMfaControllerConfirm,
  useMfaControllerDisable,
  getMfaControllerGetStatusQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { MfaSetupResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

/**
 * Self-service two-factor management in account settings: status, the
 * enable flow (setup → confirm → one-time recovery codes) and the
 * code-guarded disable flow.
 */
export function useMfa() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const statusQuery = useMfaControllerGetStatus();
  const setupMutation = useMfaControllerSetup();
  const confirmMutation = useMfaControllerConfirm();
  const disableMutation = useMfaControllerDisable();
  const [setup, setSetup] = useState<MfaSetupResponseDto | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invalidateStatus = () =>
    queryClient.invalidateQueries({
      queryKey: getMfaControllerGetStatusQueryKey(),
    });

  const mapCodeError = (error: unknown) => {
    try {
      const { code } = extractErrorData(error);
      if (code === 'INVALID_MFA_CODE') {
        setErrorMessage(t('account.mfa.error.invalidCode'));
      } else if (code === 'MFA_LOCKED') {
        setErrorMessage(t('account.mfa.error.locked'));
      } else if (code === 'MFA_REQUIRED_BY_ORG') {
        showError(t('account.mfa.error.requiredByOrg'));
      } else {
        showError(t('account.mfa.error.unexpected'));
      }
    } catch {
      showError(t('account.mfa.error.unexpected'));
    }
  };

  const startSetup = () => {
    setErrorMessage(null);
    setupMutation.mutate(undefined, {
      onSuccess: (data) => setSetup(data),
      onError: mapCodeError,
    });
  };

  const confirm = (code: string) => {
    setErrorMessage(null);
    confirmMutation.mutate(
      { data: { code } },
      {
        onSuccess: (data) => {
          setRecoveryCodes(data.recoveryCodes);
          void invalidateStatus();
        },
        onError: mapCodeError,
      },
    );
  };

  const disable = (code: string, onDone: () => void) => {
    setErrorMessage(null);
    disableMutation.mutate(
      { data: { code } },
      {
        onSuccess: () => {
          showSuccess(t('account.mfa.disabledSuccessfully'));
          void invalidateStatus();
          onDone();
        },
        onError: mapCodeError,
      },
    );
  };

  const resetEnrollmentState = () => {
    setSetup(null);
    setRecoveryCodes(null);
    setErrorMessage(null);
  };

  return {
    status: statusQuery.data,
    isLoadingStatus: statusQuery.isLoading,
    isStatusError: statusQuery.isError,
    startSetup,
    isSettingUp: setupMutation.isPending,
    setup,
    confirm,
    isConfirming: confirmMutation.isPending,
    recoveryCodes,
    disable,
    isDisabling: disableMutation.isPending,
    errorMessage,
    resetEnrollmentState,
  };
}
