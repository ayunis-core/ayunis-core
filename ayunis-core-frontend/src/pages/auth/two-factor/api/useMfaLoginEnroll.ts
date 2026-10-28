import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useMfaLoginControllerSetup,
  useMfaLoginControllerConfirmSetup,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { MfaSetupResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { rememberSuccessfulSsoLogin } from '@/features/sso';

/**
 * Forced enrollment during login: starts TOTP setup on mount, confirms the
 * code, and surfaces the one-time recovery codes. Session cookies are set by
 * the confirm call, so navigation only happens after the codes are saved.
 */
export function useMfaLoginEnroll() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [setup, setSetup] = useState<MfaSetupResponseDto | null>(null);
  const [setupUnavailable, setSetupUnavailable] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  const handlePendingError = (error: unknown): string | undefined => {
    try {
      const { code: errorCode } = extractErrorData(error);
      if (errorCode === 'INVALID_MFA_CODE') {
        setErrorMessage(t('twoFactor.error.invalidCode'));
      } else if (
        errorCode === 'MFA_PENDING_TOKEN_INVALID' ||
        errorCode === 'MFA_ENROLLMENT_NOT_ALLOWED'
      ) {
        showError(t('twoFactor.error.expired'));
        void navigate({ to: '/login' });
      } else if (errorCode === 'SERVICE_UNAVAILABLE') {
        showError(t('serviceUnavailable'));
      } else {
        showError(t('twoFactor.error.unexpected'));
      }
      return errorCode;
    } catch {
      showError(t('twoFactor.error.unexpected'));
      return undefined;
    }
  };

  // Callbacks must live on the mutation options, not on mutate(): the setup
  // mutation starts in the mount effect, and StrictMode's simulated remount
  // detaches the observer from the in-flight mutation, silently dropping
  // mutate-level callbacks.
  const setupMutation = useMfaLoginControllerSetup({
    mutation: {
      retry: false,
      onSuccess: (data) => {
        setSetupUnavailable(false);
        setSetup(data);
      },
      onError: (error) => {
        setSetupUnavailable(
          handlePendingError(error) === 'SERVICE_UNAVAILABLE',
        );
      },
    },
  });
  const confirmMutation = useMfaLoginControllerConfirmSetup({
    mutation: {
      retry: false,
      onSuccess: (data) => {
        rememberSuccessfulSsoLogin();
        setRecoveryCodes(data.recoveryCodes);
      },
      onError: handlePendingError,
    },
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setupMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start setup exactly once on mount
  }, []);

  const confirm = (code: string) => {
    setErrorMessage(null);
    confirmMutation.mutate({ data: { code } });
  };

  const retrySetup = () => {
    setSetupUnavailable(false);
    setupMutation.mutate();
  };

  return {
    setup,
    setupUnavailable,
    retrySetup,
    isSettingUp: setupMutation.isPending,
    confirm,
    isConfirming: confirmMutation.isPending,
    recoveryCodes,
    errorMessage,
  };
}
