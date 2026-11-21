import type { UUID } from 'crypto';
import type { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';

export interface OnboardingStageResult {
  stage: OnboardingStage | null;
  /** The permitted model a profile chat runs on; `null` for every other stage. */
  modelId: UUID | null;
}
