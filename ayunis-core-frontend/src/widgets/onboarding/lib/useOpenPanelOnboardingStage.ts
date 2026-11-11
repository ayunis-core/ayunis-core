import { useEffect } from 'react';
import { MeResponseDtoRole, useAuthenticationControllerMe } from '@/shared/api';
import type { OpenPanelGlobalProperties } from '@/shared/lib/openpanel-events';
import { setOpenPanelOnboardingStage } from '@/shared/lib/openpanel-identity';
import { createAuthorization } from '@/features/permissions';
import { useOnboarding } from '@/widgets/onboarding/api/useOnboarding';
import { useOnboardingProgress } from './useOnboardingProgress';

type OnboardingStage = OpenPanelGlobalProperties['onboarding_stage'];

export function onboardingStage({
  hidden,
  completedCount,
  totalSteps,
}: {
  hidden: boolean;
  completedCount: number;
  totalSteps: number;
}): OnboardingStage {
  if (hidden) return 'dismissed';
  if (completedCount === 0) return 'not_started';
  return completedCount === totalSteps ? 'completed' : 'started';
}

/** Keeps `onboarding_stage` on every OpenPanel event in step with the checklist. */
export function useOpenPanelOnboardingStage(): void {
  const { data: user, dataUpdatedAt: userFetchedAt } =
    useAuthenticationControllerMe();
  const isAdmin = createAuthorization(user?.role).hasRole(
    MeResponseDtoRole.admin,
  );
  const { completedStepIds, hidden, fetchedAt, isLoading } = useOnboarding();
  const { completedCount, totalSteps } = useOnboardingProgress(
    isAdmin,
    completedStepIds,
  );
  // The onboarding cache isn't keyed by user: after another user signed in,
  // a checklist fetched before /auth/me resolved may be the previous user's.
  const isCurrentUsersChecklist = !isLoading && fetchedAt >= userFetchedAt;
  const stage = isCurrentUsersChecklist
    ? onboardingStage({ hidden, completedCount, totalSteps })
    : undefined;
  const userId = user?.id;

  useEffect(() => {
    if (userId && stage) setOpenPanelOnboardingStage(userId, stage);
  }, [userId, stage]);
}
