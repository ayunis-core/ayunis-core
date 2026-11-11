import type { UpdateOnboardingDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { ONBOARDING_CATEGORIES } from '@/widgets/onboarding/config/categories';

const STEP_IDS = ONBOARDING_CATEGORIES.flatMap((category) =>
  category.steps.map((step) => step.id),
);

export function trackOnboardingChanges(
  previous: UpdateOnboardingDto,
  saved: UpdateOnboardingDto,
): void {
  const wasChecked = new Set(previous.completedStepIds);
  const isChecked = new Set(saved.completedStepIds);
  for (const stepId of STEP_IDS) {
    const checked = isChecked.has(stepId);
    if (wasChecked.has(stepId) !== checked) {
      trackOpenPanelEvent('onboarding_step_toggled', {
        step_id: stepId,
        checked,
      });
    }
  }
  if (previous.hidden !== saved.hidden) {
    trackOpenPanelEvent('onboarding_hidden_changed', { hidden: saved.hidden });
  }
}
