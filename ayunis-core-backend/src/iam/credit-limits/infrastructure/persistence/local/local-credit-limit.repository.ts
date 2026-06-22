import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { CreditLimitRepository } from '../../../application/ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import {
  CreditLimitRecord,
  UserCreditLimitRecord,
  TeamCreditLimitRecord,
} from './schema/credit-limit.record';
import { CreditLimitMapper } from './mappers/credit-limit.mapper';

@Injectable()
export class LocalCreditLimitRepository extends CreditLimitRepository {
  constructor(
    @InjectRepository(CreditLimitRecord)
    private readonly repository: Repository<CreditLimitRecord>,
    @InjectRepository(UserCreditLimitRecord)
    private readonly userRepository: Repository<UserCreditLimitRecord>,
    @InjectRepository(TeamCreditLimitRecord)
    private readonly teamRepository: Repository<TeamCreditLimitRecord>,
    private readonly mapper: CreditLimitMapper,
  ) {
    super();
  }

  async save(limit: CreditLimit): Promise<CreditLimit> {
    const record = this.mapper.toRecord(limit);
    const saved = await this.repository.save(record);
    return this.mapper.toDomain(saved);
  }

  async findUserLimits(orgId: UUID): Promise<CreditLimit[]> {
    const records = await this.userRepository.find({ where: { orgId } });
    return this.mapper.toDomainArray(records);
  }

  async findTeamLimits(orgId: UUID): Promise<CreditLimit[]> {
    const records = await this.teamRepository.find({ where: { orgId } });
    return this.mapper.toDomainArray(records);
  }

  async findByUserId(orgId: UUID, userId: UUID): Promise<CreditLimit | null> {
    const record = await this.userRepository.findOne({
      where: { orgId, userId },
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByTeamId(orgId: UUID, teamId: UUID): Promise<CreditLimit | null> {
    const record = await this.teamRepository.findOne({
      where: { orgId, teamId },
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByTeamIds(orgId: UUID, teamIds: UUID[]): Promise<CreditLimit[]> {
    if (teamIds.length === 0) {
      return [];
    }
    const records = await this.teamRepository.find({
      where: { orgId, teamId: In(teamIds) },
    });
    return this.mapper.toDomainArray(records);
  }

  async deleteByUserId(orgId: UUID, userId: UUID): Promise<void> {
    await this.userRepository.delete({ orgId, userId });
  }

  async deleteByTeamId(orgId: UUID, teamId: UUID): Promise<void> {
    await this.teamRepository.delete({ orgId, teamId });
  }

  async deleteByOrg(orgId: UUID): Promise<void> {
    // Removes both user- and team-scoped rows;
    await this.repository.delete({ orgId });
  }
}
