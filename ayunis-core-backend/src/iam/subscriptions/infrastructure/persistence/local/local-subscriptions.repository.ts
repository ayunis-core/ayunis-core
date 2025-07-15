import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRecord } from './schema/subscription.record';
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
      await this.subscriptionRepository.save(record);
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
