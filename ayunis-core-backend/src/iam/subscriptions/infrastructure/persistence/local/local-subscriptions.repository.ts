import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRecord } from './schema/subscription.record';
import { SubscriptionMapper } from './mappers/subscription.mapper';

@Injectable()
export class LocalSubscriptionsRepository extends SubscriptionRepository {
  private readonly logger = new Logger(LocalSubscriptionsRepository.name);

  constructor(
    @InjectRepository(SubscriptionRecord)
    private readonly subscriptionRepository: Repository<SubscriptionRecord>,
    private readonly subscriptionMapper: SubscriptionMapper,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<Subscription | null> {
    try {
      const record = await this.subscriptionRepository.findOne({
        where: { orgId },
        relations: ['org'],
      });

      if (!record) {
        return null;
      }

      return this.subscriptionMapper.toDomain(record);
    } catch (error) {
      this.logger.error(`Failed to find subscription by orgId ${orgId}`, error);
      throw error;
    }
  }

  async create(subscription: Subscription): Promise<void> {
    try {
      const record = this.subscriptionMapper.toRecord(subscription);
      await this.subscriptionRepository.save(record);
      this.logger.log(`Created subscription with id ${subscription.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to create subscription with id ${subscription.id}`,
        error,
      );
      throw error;
    }
  }

  async update(subscription: Subscription): Promise<void> {
    try {
      const record = this.subscriptionMapper.toRecord(subscription);
      await this.subscriptionRepository.save(record);
      this.logger.log(`Updated subscription with id ${subscription.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to update subscription with id ${subscription.id}`,
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
