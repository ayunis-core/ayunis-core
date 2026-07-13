import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, UUID } from 'crypto';
import { OnboardingRepository } from 'src/iam/onboarding/application/ports/onboarding.repository';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingRecord } from './schema/onboarding.record';
import { OnboardingMapper } from './mappers/onboarding.mapper';

@Injectable()
export class LocalOnboardingRepository extends OnboardingRepository {
  constructor(
    @InjectRepository(OnboardingRecord)
    private readonly onboardingRepository: Repository<OnboardingRecord>,
    private readonly onboardingMapper: OnboardingMapper,
  ) {
    super();
  }

  async findByUserId(userId: UUID): Promise<Onboarding | null> {
    const record = await this.onboardingRepository.findOne({
      where: { userId },
    });
    return record ? this.onboardingMapper.toDomain(record) : null;
  }

  async saveProgress(onboarding: Onboarding): Promise<Onboarding> {
    const rows: OnboardingRecord[] = await this.onboardingRepository.query(
      `INSERT INTO onboarding
         ("id", "userId", "completedStepIds", "hidden", "createdAt", "updatedAt")
       VALUES ($1, $2, $3::text[], $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("userId") DO UPDATE
       SET "completedStepIds" = EXCLUDED."completedStepIds",
       "hidden" = EXCLUDED."hidden",
       "updatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        onboarding.id,
        onboarding.userId,
        onboarding.completedStepIds,
        onboarding.hidden,
      ],
    );
    const record = rows.at(0);

    if (!record) {
      throw new Error('Saving onboarding progress returned no record');
    }

    return this.onboardingMapper.toDomain(record);
  }

  async markWelcomeVideoSeen(userId: UUID, seenAt: Date): Promise<Onboarding> {
    const rows: OnboardingRecord[] = await this.onboardingRepository.query(
      `INSERT INTO onboarding
         ("id", "userId", "welcomeVideoSeenAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("userId") DO UPDATE
       SET "welcomeVideoSeenAt" = COALESCE(onboarding."welcomeVideoSeenAt", EXCLUDED."welcomeVideoSeenAt"),
       "updatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [randomUUID(), userId, seenAt],
    );
    const record = rows.at(0);

    if (!record) {
      throw new Error('Marking welcome video as seen returned no record');
    }

    return this.onboardingMapper.toDomain(record);
  }
}
