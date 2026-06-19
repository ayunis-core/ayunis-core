import type { UUID } from 'crypto';
import type { Onboarding } from '../../domain/onboarding.entity';

export abstract class OnboardingRepository {
  abstract findByUserId(userId: UUID): Promise<Onboarding | null>;
  abstract save(onboarding: Onboarding): Promise<Onboarding>;
}
