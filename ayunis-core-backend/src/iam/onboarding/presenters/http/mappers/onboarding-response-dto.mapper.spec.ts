import { randomUUID } from 'crypto';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingResponseDtoMapper } from './onboarding-response-dto.mapper';

describe('OnboardingResponseDtoMapper', () => {
  it('exposes when the welcome video was seen', () => {
    const welcomeVideoSeenAt = new Date('2026-08-05T12:00:00.000Z');
    const onboarding = new Onboarding({
      userId: randomUUID(),
      welcomeVideoSeenAt,
    });

    expect(new OnboardingResponseDtoMapper().toDto(onboarding)).toEqual({
      completedStepIds: [],
      hidden: false,
      welcomeVideoSeenAt,
    });
  });
});
