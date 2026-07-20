import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { CreditLimit } from 'src/iam/credit-limits/domain/credit-limit.entity';
import type { UserCreditLimit } from 'src/iam/credit-limits/domain/user-credit-limit.entity';
import type { TeamCreditLimit } from 'src/iam/credit-limits/domain/team-credit-limit.entity';
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

  async save<T extends CreditLimit>(limit: T): Promise<T> {
    const record = this.mapper.toRecord(limit);
    const saved = await this.repository.save(record);
    return this.mapper.toDomain(saved) as T;
  }

  async findUserLimits(orgId: UUID): Promise<UserCreditLimit[]> {
    const records = await this.userRepository.find({ where: { orgId } });
    return records.map((record) => this.mapper.toUserDomain(record));
  }

  async findTeamLimits(orgId: UUID): Promise<TeamCreditLimit[]> {
    const records = await this.teamRepository.find({ where: { orgId } });
    return records.map((record) => this.mapper.toTeamDomain(record));
  }

  async findByUserId(
    orgId: UUID,
    userId: UUID,
  ): Promise<UserCreditLimit | null> {
    const record = await this.userRepository.findOne({
      where: { orgId, userId },
    });
    return record ? this.mapper.toUserDomain(record) : null;
  }

  async findByTeamId(
    orgId: UUID,
    teamId: UUID,
  ): Promise<TeamCreditLimit | null> {
    const record = await this.teamRepository.findOne({
      where: { orgId, teamId },
    });
    return record ? this.mapper.toTeamDomain(record) : null;
  }

  async findByTeamIds(
    orgId: UUID,
    teamIds: UUID[],
  ): Promise<TeamCreditLimit[]> {
    if (teamIds.length === 0) {
      return [];
    }
    const records = await this.teamRepository.find({
      where: { orgId, teamId: In(teamIds) },
    });
    return records.map((record) => this.mapper.toTeamDomain(record));
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
