import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  onboardingControllerUpdateOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateOnboardingDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';

/**
 * Persists onboarding progress (completed step IDs + hidden flag). The backend
 * is a dumb store — all onboarding logic lives on the frontend. Invalidates the
 * onboarding query so consumers re-read the fresh state.
 */
export function useUpdateOnboarding() {
  const { t } = useTranslation('getting-started');
  const queryClient = useQueryClient();
  const queueRef = useRef<UpdateOnboardingDto | null>(null);
  const flushingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async (data: UpdateOnboardingDto) => {
      return await onboardingControllerUpdateOnboarding(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getOnboardingControllerGetOnboardingQueryKey(),
      });
    },
    onError: () => {
      showError(t('saveError'));
    },
  });

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    if (!queueRef.current) return;
    flushingRef.current = true;
    try {
      // Process the latest desired state; coalesce intermediate updates
      // by always reading and clearing the queue before sending.
      // If another update is queued while the request is in flight,
      // loop and send the most recent one next.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = queueRef.current;
        if (!next) break;
        queueRef.current = null;
        await mutation.mutateAsync(next);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [mutation]);

  return {
    updateOnboarding: (data: UpdateOnboardingDto) => {
      queueRef.current = data;
      void flush();
    },
    isLoading: mutation.isPending || flushingRef.current,
  };
}
