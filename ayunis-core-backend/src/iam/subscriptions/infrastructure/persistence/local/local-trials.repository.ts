import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrialRepository } from 'src/iam/subscriptions/application/ports/trial.repository';
import { Trial } from 'src/iam/subscriptions/domain/trial.entity';
import { TrialRecord } from './schema/trial.record';
import { UUID } from 'crypto';

@Injectable()
export class LocalTrialsRepository extends TrialRepository {
  constructor(
    @InjectRepository(TrialRecord)
    private readonly trialRecord: Repository<TrialRecord>,
  ) {
    super();
  }

  async create(trial: Trial): Promise<Trial> {
    const record = new TrialRecord();

    record.id = trial.id;
    record.createdAt = trial.createdAt;
    record.updatedAt = trial.updatedAt;
    record.orgId = trial.orgId;
    record.messagesSent = trial.messagesSent;
    record.maxMessages = trial.maxMessages;

    const saved = await this.trialRecord.save(record);

    return new Trial({
      id: saved.id,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      orgId: saved.orgId,
      messagesSent: saved.messagesSent,
      maxMessages: saved.maxMessages,
    });
  }

  async findByOrgId(orgId: UUID): Promise<Trial | null> {
    const record = await this.trialRecord.findOne({
      where: { orgId },
    });

    if (!record) {
      return null;
    }

    return new Trial({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      orgId: record.orgId,
      messagesSent: record.messagesSent,
      maxMessages: record.maxMessages,
    });
  }

  async incrementMessagesSent(orgId: UUID): Promise<Trial | null> {
    const result = await this.trialRecord.increment(
      { orgId },
      'messagesSent',
      1,
    );

    if (result.affected === 0) {
      return null;
    }

    const record = await this.trialRecord.findOne({
      where: { orgId },
    });

    if (!record) {
      return null;
    }

    return new Trial({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      orgId: record.orgId,
      messagesSent: record.messagesSent,
      maxMessages: record.maxMessages,
    });
  }
}
