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

/**
 * Forced enrollment during login: starts TOTP setup on mount, confirms the
 * code, and surfaces the one-time recovery codes. Session cookies are set by
 * the confirm call, so navigation only happens after the codes are saved.
 */
export function useMfaLoginEnroll() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [setup, setSetup] = useState<MfaSetupResponseDto | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  const handlePendingError = (error: unknown) => {
    try {
      const { code: errorCode } = extractErrorData(error);
      if (errorCode === 'INVALID_MFA_CODE') {
        setErrorMessage(t('twoFactor.error.invalidCode'));
        return;
      }
      if (
        errorCode === 'MFA_PENDING_TOKEN_INVALID' ||
        errorCode === 'MFA_ENROLLMENT_NOT_ALLOWED'
      ) {
        showError(t('twoFactor.error.expired'));
        void navigate({ to: '/login' });
        return;
      }
      showError(t('twoFactor.error.unexpected'));
    } catch {
      showError(t('twoFactor.error.unexpected'));
    }
  };

  // Callbacks must live on the mutation options, not on mutate(): the setup
  // mutation starts in the mount effect, and StrictMode's simulated remount
  // detaches the observer from the in-flight mutation, silently dropping
  // mutate-level callbacks.
  const setupMutation = useMfaLoginControllerSetup({
    mutation: {
      onSuccess: (data) => setSetup(data),
      onError: handlePendingError,
    },
  });
  const confirmMutation = useMfaLoginControllerConfirmSetup({
    mutation: {
      onSuccess: (data) => setRecoveryCodes(data.recoveryCodes),
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

  return {
    setup,
    isSettingUp: setupMutation.isPending,
    confirm,
    isConfirming: confirmMutation.isPending,
    recoveryCodes,
    errorMessage,
  };
}
