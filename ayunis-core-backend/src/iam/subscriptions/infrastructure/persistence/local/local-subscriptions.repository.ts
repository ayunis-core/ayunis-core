import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { UUID } from 'crypto';
import {
  ReplaceSubscriptionParams,
  SubscriptionRepository,
} from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
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
    private readonly subscriptionMapper: SubscriptionMapper,
    private readonly subscriptionBillingInfoMapper: SubscriptionBillingInfoMapper,
    private readonly dataSource: DataSource,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  // Outside an active transaction txHost.tx resolves to the adapter's fallback
  // instance (dataSource.manager), so this is safe without a null check.
  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get subscriptions(): Repository<SubscriptionRecord> {
    return this.getManager().getRepository(SubscriptionRecord);
  }

  private get billingInfo(): Repository<SubscriptionBillingInfoRecord> {
    return this.getManager().getRepository(SubscriptionBillingInfoRecord);
  }

  // Join the caller's transaction when there is one, so an outer rollback also
  // undoes these writes. Standalone callers still get their own transaction.
  //
  // Must test isTransactionActive(): txHost.tx never returns undefined — outside
  // a transaction it yields the adapter's fallback instance (dataSource.manager),
  // so a truthiness check would silently skip opening a real transaction.
  private runInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.txHost.isTransactionActive()
      ? work(this.txHost.tx)
      : this.dataSource.transaction(work);
  }

  async findByOrgId(orgId: UUID): Promise<Subscription[]> {
    try {
      const records = await this.subscriptions.find({
        where: {
          orgId,
        },
        relations: {
          billingInfo: true,
        },
      });

      return records.map((record) => this.subscriptionMapper.toDomain(record));
    } catch (error) {
      this.logger.error(
        { err: error as Error, orgId },
        'Failed to find subscription by organization ID',
      );
      throw error;
    }
  }

  async findLatestByOrgId(orgId: UUID): Promise<Subscription | null> {
    try {
      const record = await this.subscriptions.findOne({
        where: { orgId },
        relations: { billingInfo: true },
        order: { createdAt: 'DESC' },
      });

      return record ? this.subscriptionMapper.toDomain(record) : null;
    } catch (error) {
      this.logger.error(
        { err: error as Error, orgId },
        'Failed to find latest subscription by organization ID',
      );
      throw error;
    }
  }

  async findAll(): Promise<Subscription[]> {
    try {
      const records = await this.subscriptions.find();
      return records.map((record) => this.subscriptionMapper.toDomain(record));
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to find all subscriptions',
      );
      throw error;
    }
  }

  async findActiveUsageBasedOrgIds(now: Date): Promise<UUID[]> {
    try {
      const rows = await this.subscriptions
        .createQueryBuilder('subscription')
        .select('DISTINCT subscription.orgId', 'orgId')
        .where('subscription.type = :type', {
          type: SubscriptionType.USAGE_BASED,
        })
        .andWhere('subscription.cancelledAt IS NULL')
        .andWhere('subscription.startsAt <= :now', { now })
        .getRawMany<{ orgId: UUID }>();

      return rows.map((row) => row.orgId);
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to find orgs with active usage-based subscriptions',
      );
      throw error;
    }
  }

  async create(subscription: Subscription): Promise<Subscription> {
    try {
      const record = this.subscriptionMapper.toRecord(subscription);

      // Save subscription and billing info in a transaction to guarantee
      // the subscription row exists before the billing info FK references it.
      await this.runInTransaction((manager) =>
        this.insertSubscriptionWithBilling(manager, record),
      );

      this.logger.log(
        { subscriptionId: subscription.id },
        'Created subscription',
      );
      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        { err: error as Error, subscriptionId: subscription.id },
        'Failed to create subscription',
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
      await this.runInTransaction(async (manager) => {
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
        {
          oldSubscriptionId,
          disposition,
          newSubscriptionId: newSubscription.id,
        },
        'Replaced subscription',
      );
      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        { err: error as Error, oldSubscriptionId },
        'Failed to replace subscription',
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
      await this.subscriptions.save(record);
      this.logger.log(
        { subscriptionId: subscription.id },
        'Updated subscription',
      );
      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        { err: error as Error, subscriptionId: subscription.id },
        'Failed to update subscription',
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
      const record = await this.subscriptions.findOne({
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

      const updatedRecord = await this.subscriptions.save(record);
      this.logger.log(
        { subscriptionId: params.subscriptionId },
        'Updated subscription start date',
      );
      return this.subscriptionMapper.toDomain(updatedRecord);
    } catch (error) {
      this.logger.error(
        { err: error as Error, subscriptionId: params.subscriptionId },
        'Failed to update subscription start date',
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
      await this.billingInfo.save(record);
      this.logger.log({ subscriptionId }, 'Updated subscription billing info');
      return this.subscriptionBillingInfoMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        { err: error as Error, subscriptionId },
        'Failed to update subscription billing info',
      );
      throw error;
    }
  }

  async delete(id: UUID): Promise<void> {
    try {
      const result = await this.subscriptions.delete(id);
      if (result.affected === 0) {
        this.logger.warn(
          { subscriptionId: id },
          'No subscription found to delete',
        );
      } else {
        this.logger.log({ subscriptionId: id }, 'Deleted subscription');
      }
    } catch (error) {
      this.logger.error(
        { err: error as Error, subscriptionId: id },
        'Failed to delete subscription',
      );
      throw error;
    }
  }
}
