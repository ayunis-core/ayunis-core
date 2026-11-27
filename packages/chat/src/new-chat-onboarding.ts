import type { OnboardingStage } from '@ayunis/api-client/schemas';
import type { ChatOnboardingHint } from './chat-config';
import type { NewChatModel, NewChatSelection } from './start-composer';

export interface OnboardingChat {
  readonly stage: OnboardingStage;
  readonly model: NewChatModel;
  readonly isAnonymous: boolean;
}

/**
 * The chat the onboarding hint starts, or null when no hint applies. A profile
 * chat writes memory, which an anonymous chat or a model without memory access
 * doesn't have, so it ignores the composer's choices.
 */
export function onboardingChat(
  { stage, modelId }: ChatOnboardingHint,
  composer: Pick<NewChatSelection, 'model' | 'isAnonymous'>,
): OnboardingChat | null {
  if (stage === 'profile') {
    return modelId ? { stage, model: { modelId }, isAnonymous: false } : null;
  }
  if (stage === 'first_skill' && composer.model) {
    return { stage, model: composer.model, isAnonymous: composer.isAnonymous };
  }
  return null;
}
