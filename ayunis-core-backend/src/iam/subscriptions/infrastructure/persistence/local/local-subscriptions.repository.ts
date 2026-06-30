import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { UUID } from 'crypto';
import {
  ReplaceSubscriptionParams,
  SubscriptionRepository,
} from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';
import {
  SeatBasedSubscriptionRecord,
  SubscriptionRecord,
} from './schema/subscription.record';
import { SubscriptionMapper } from './mappers/subscription.mapper';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionBillingInfoRecord } from './schema/subscription-billing-info.record';
import { SubscriptionBillingInfoMapper } from './mappers/subscription-billing-info.mapper';

@Injectable()
export class LocalSubscriptionsRepository extends SubscriptionRepository {
  private readonly logger = new Logger(LocalSubscriptionsRepository.name);

  constructor(
    @InjectRepository(SubscriptionRecord)
    private readonly subscriptionRepository: Repository<SubscriptionRecord>,
    @InjectRepository(SubscriptionBillingInfoRecord)
    private readonly subscriptionBillingInfoRepository: Repository<SubscriptionBillingInfoRecord>,
    private readonly subscriptionMapper: SubscriptionMapper,
    private readonly subscriptionBillingInfoMapper: SubscriptionBillingInfoMapper,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<Subscription[]> {
    try {
      const records = await this.subscriptionRepository.find({
        where: {
          orgId,
        },
        relations: {
          billingInfo: true,
        },
      });

      return records.map((record) => this.subscriptionMapper.toDomain(record));
    } catch (error) {
      this.logger.error(`Failed to find subscription by orgId ${orgId}`, error);
      throw error;
    }
  }

  async findLatestByOrgId(orgId: UUID): Promise<Subscription | null> {
    try {
      const record = await this.subscriptionRepository.findOne({
        where: { orgId },
        relations: { billingInfo: true },
        order: { createdAt: 'DESC' },
      });

      return record ? this.subscriptionMapper.toDomain(record) : null;
    } catch (error) {
      this.logger.error(
        `Failed to find latest subscription by orgId ${orgId}`,
        error,
      );
      throw error;
    }
  }

  async findAll(): Promise<Subscription[]> {
    try {
      const records = await this.subscriptionRepository.find();
      return records.map((record) => this.subscriptionMapper.toDomain(record));
    } catch (error) {
      this.logger.error(`Failed to find all subscriptions`, error);
      throw error;
    }
  }

  async create(subscription: Subscription): Promise<Subscription> {
    try {
      const record = this.subscriptionMapper.toRecord(subscription);

      // Save subscription and billing info in a transaction to guarantee
      // the subscription row exists before the billing info FK references it.
      await this.dataSource.transaction((manager) =>
        this.insertSubscriptionWithBilling(manager, record),
      );

      this.logger.log(`Created subscription with id ${subscription.id}`);
      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        `Failed to create subscription with id ${subscription.id}`,
        error,
      );
      throw error;
    }
  }

  async replace(params: ReplaceSubscriptionParams): Promise<Subscription> {
    const { oldSubscriptionId, disposition, newSubscription } = params;
    try {
      const record = this.subscriptionMapper.toRecord(newSubscription);

      // End the old subscription and insert the new one atomically so the org
      // is never left without a subscription (or with two active ones).
      await this.dataSource.transaction(async (manager) => {
        if (disposition === OldSubscriptionDisposition.DELETE) {
          await manager.delete(SubscriptionRecord, oldSubscriptionId);
        } else {
          // Only stamp cancelledAt when not already cancelled, so replacing an
          // already-cancelled subscription preserves its original cancellation
          // timestamp (kept for billing/audit history).
          await manager.update(
            SubscriptionRecord,
            { id: oldSubscriptionId, cancelledAt: IsNull() },
            { cancelledAt: new Date() },
          );
        }
        await this.insertSubscriptionWithBilling(manager, record);
      });

      this.logger.log(
        `Replaced subscription ${oldSubscriptionId} (${disposition}) with ${newSubscription.id}`,
      );
      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        `Failed to replace subscription ${oldSubscriptionId}`,
        error,
      );
      throw error;
    }
  }

  // Persists a subscription record and its billing info, ensuring the
  // subscription row exists before the billing-info FK references it.
  private async insertSubscriptionWithBilling(
    manager: EntityManager,
    record: SubscriptionRecord,
  ): Promise<void> {
    const billingInfo = record.billingInfo;
    record.billingInfo = undefined as unknown as SubscriptionBillingInfoRecord;
    await manager.save(SubscriptionRecord, record);
    await manager.save(SubscriptionBillingInfoRecord, billingInfo);
    record.billingInfo = billingInfo;
  }

  async update(subscription: Subscription): Promise<Subscription> {
    try {
      const record = this.subscriptionMapper.toRecord(subscription);
      await this.subscriptionRepository.save(record);
      this.logger.log(`Updated subscription with id ${subscription.id}`);
      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        `Failed to update subscription with id ${subscription.id}`,
        error,
      );
      throw error;
    }
  }

  async updateStartDate(params: {
    subscriptionId: UUID;
    startsAt: Date;
    renewalCycleAnchor?: Date;
  }): Promise<Subscription> {
    try {
      const record = await this.subscriptionRepository.findOne({
        where: { id: params.subscriptionId },
        relations: { billingInfo: true },
      });

      if (!record) {
        throw new Error(
          `Subscription with id ${params.subscriptionId} not found`,
        );
      }

      record.startsAt = params.startsAt;
      if (
        record instanceof SeatBasedSubscriptionRecord &&
        params.renewalCycleAnchor
      ) {
        record.renewalCycleAnchor = params.renewalCycleAnchor;
      }

      const updatedRecord = await this.subscriptionRepository.save(record);
      this.logger.log(
        `Updated start date for subscription with id ${params.subscriptionId}`,
      );
      return this.subscriptionMapper.toDomain(updatedRecord);
    } catch (error) {
      this.logger.error(
        `Failed to update start date for subscription with id ${params.subscriptionId}`,
        error,
      );
      throw error;
    }
  }

  async updateBillingInfo(
    subscriptionId: UUID,
    billingInfo: SubscriptionBillingInfo,
  ): Promise<SubscriptionBillingInfo> {
    try {
      const record = this.subscriptionBillingInfoMapper.toRecord(
        billingInfo,
        subscriptionId,
      );
      await this.subscriptionBillingInfoRepository.save(record);
      this.logger.log(
        `Updated billing info for subscription with id ${subscriptionId}`,
      );
      return this.subscriptionBillingInfoMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        `Failed to update billing info for subscription with id ${subscriptionId}`,
        error,
      );
      throw error;
    }
  }

  async delete(id: UUID): Promise<void> {
    try {
      const result = await this.subscriptionRepository.delete(id);
      if (result.affected === 0) {
        this.logger.warn(`No subscription found with id ${id} to delete`);
      } else {
        this.logger.log(`Deleted subscription with id ${id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete subscription with id ${id}`, error);
      throw error;
    }
  }
}
