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
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(onboarding: Onboarding): OnboardingRecord {
    const record = new OnboardingRecord();
    record.id = onboarding.id;
    record.userId = onboarding.userId;
    record.completedStepIds = onboarding.completedStepIds;
    record.hidden = onboarding.hidden;
    record.createdAt = onboarding.createdAt;
    record.updatedAt = onboarding.updatedAt;
    return record;
  }
}
