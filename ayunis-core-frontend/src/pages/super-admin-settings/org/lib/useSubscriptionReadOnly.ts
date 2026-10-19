import { useFeatureToggles } from '@/features/feature-toggles';

export function useSubscriptionReadOnly(): boolean {
  const { toggles } = useFeatureToggles();
  return toggles?.externalSubscriptionsEnabled !== false;
}
