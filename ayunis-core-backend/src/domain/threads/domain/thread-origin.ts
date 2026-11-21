import type { UUID } from 'crypto';
import type { OnboardingStage } from 'src/iam/onboarding/domain/value-objects/onboarding-stage.enum';
import type { GuideFeature } from 'src/domain/threads/domain/guide-feature.enum';

export enum ThreadOriginKind {
  CHAT = 'chat',
  ROUTINE = 'routine',
  NOTIFICATION = 'notification',
  RELEASE_NOTE = 'release_note',
  ONBOARDING = 'onboarding',
  FEATURE_GUIDE = 'feature_guide',
}

/**
 * Why a thread exists; every thread has exactly one origin. Deleting the
 * routine, notification or release note a thread came from clears its id but
 * keeps the kind.
 */
export type ThreadOrigin =
  | { readonly kind: ThreadOriginKind.CHAT }
  | { readonly kind: ThreadOriginKind.ROUTINE; readonly routineId: UUID | null }
  | {
      readonly kind: ThreadOriginKind.NOTIFICATION;
      readonly notificationId: UUID | null;
    }
  | {
      readonly kind: ThreadOriginKind.RELEASE_NOTE;
      readonly releaseNoteId: UUID | null;
    }
  | {
      readonly kind: ThreadOriginKind.ONBOARDING;
      readonly stage: OnboardingStage;
    }
  | {
      readonly kind: ThreadOriginKind.FEATURE_GUIDE;
      readonly feature: GuideFeature;
    };

export const CHAT_ORIGIN: ThreadOrigin = { kind: ThreadOriginKind.CHAT };
