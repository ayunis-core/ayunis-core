import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { OnboardingRepository } from '../../../application/ports/onboarding.repository';
import { Onboarding } from '../../../domain/onboarding.entity';
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

  async save(onboarding: Onboarding): Promise<Onboarding> {
    const record = this.onboardingMapper.toRecord(onboarding);
    const saved = await this.onboardingRepository.save(record);
    return this.onboardingMapper.toDomain(saved);
  }
}
