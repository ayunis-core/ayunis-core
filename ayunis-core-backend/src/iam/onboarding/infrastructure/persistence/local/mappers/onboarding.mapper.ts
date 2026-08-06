import { Injectable } from '@nestjs/common';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingRecord } from '../schema/onboarding.record';

@Injectable()
export class OnboardingMapper {
  toDomain(record: OnboardingRecord): Onboarding {
    return new Onboarding({
      id: record.id,
      userId: record.userId,
      completedStepIds: record.completedStepIds,
      hidden: record.hidden,
      welcomeVideoSeenAt: record.welcomeVideoSeenAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
