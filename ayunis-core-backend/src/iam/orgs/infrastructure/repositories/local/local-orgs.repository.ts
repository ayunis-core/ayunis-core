import { Injectable, Logger } from '@nestjs/common';
import {
  OrgsRepository,
  OrgsPagination,
  OrgsFilters,
} from '../../../application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgRecord } from './schema/org.record';
import { OrgMapper } from './mappers/org.mapper';
import { UUID } from 'crypto';
import {
  OrgNotFoundError,
  OrgCreationFailedError,
  OrgUpdateFailedError,
  OrgDeletionFailedError,
  OrgRetrievalFailedError,
} from '../../../application/orgs.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { SubscriptionRecord } from '../../../../subscriptions/infrastructure/persistence/local/schema/subscription.record';

@Injectable()
export class LocalOrgsRepository extends OrgsRepository {
  private readonly logger = new Logger(LocalOrgsRepository.name);

  constructor(
    @InjectRepository(OrgRecord)
    private readonly orgRepository: Repository<OrgRecord>,
  ) {
    super();
    this.logger.log('constructor');
  }

  async findById(id: UUID): Promise<Org> {
    this.logger.log('findById', { id });

    try {
      const orgEntity = await this.orgRepository.findOne({
        where: { id },
      });
      if (!orgEntity) {
        this.logger.warn('Organization not found', { id });
        throw new OrgNotFoundError(id);
      }

      this.logger.debug('Organization found', { id, name: orgEntity.name });
      return OrgMapper.toDomain(orgEntity);
    } catch (error) {
      if (error instanceof OrgNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error finding organization', { error: err, id });
      throw new OrgNotFoundError(id);
    }
  }

  async findByUserId(userId: UUID): Promise<Org> {
    this.logger.log('findByUserId', { userId });

    const orgEntity = await this.orgRepository.findOne({
      where: { users: { id: userId } },
    });

    if (!orgEntity) {
      this.logger.warn('Organization not found', { userId });
      throw new OrgNotFoundError(userId);
    }

    return OrgMapper.toDomain(orgEntity);
  }

  async findAllIds(): Promise<UUID[]> {
    const orgs = await this.orgRepository.find({
      select: { id: true },
    });
    return orgs.map((org) => org.id);
  }

  async findAllForSuperAdmin(
    pagination: OrgsPagination,
    filters?: OrgsFilters,
  ): Promise<Paginated<Org>> {
    this.logger.log('findAllForSuperAdmin', {
      limit: pagination.limit,
      offset: pagination.offset,
      search: filters?.search,
      hasActiveSubscription: filters?.hasActiveSubscription,
    });

    try {
      const queryBuilder = this.orgRepository
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.users', 'users')
        .orderBy('org.createdAt', 'DESC');

      // Apply search filter (case-insensitive)
      if (filters?.search) {
        queryBuilder.andWhere('org.name ILIKE :search', {
          search: `%${filters.search}%`,
        });
      }

      // Apply active subscription filter
      if (filters?.hasActiveSubscription !== undefined) {
        // Create a subquery to find org IDs with active subscriptions
        // A subscription is considered active if:
        // 1. It's not cancelled (cancelledAt IS NULL), OR
        // 2. It's cancelled but still in grace period (current date <= last billing date)
        const activeSubscriptionSubquery = queryBuilder
          .subQuery()
          .select('DISTINCT sub.orgId')
          .from(SubscriptionRecord, 'sub')
          .where(
            `(sub.cancelledAt IS NULL OR 
              (sub.renewalCycle = 'monthly' AND 
               (sub.renewalCycleAnchor + 
                (((EXTRACT(YEAR FROM sub.cancelledAt) - EXTRACT(YEAR FROM sub.renewalCycleAnchor)) * 12 +
                  (EXTRACT(MONTH FROM sub.cancelledAt) - EXTRACT(MONTH FROM sub.renewalCycleAnchor)) +
                  CASE WHEN EXTRACT(DAY FROM sub.cancelledAt) >= EXTRACT(DAY FROM sub.renewalCycleAnchor) THEN 1 ELSE 0 END
                 ) || ' months')::INTERVAL
               ) >= CURRENT_TIMESTAMP) OR
              (sub.renewalCycle = 'yearly' AND
               (sub.renewalCycleAnchor + 
                (((EXTRACT(YEAR FROM sub.cancelledAt) - EXTRACT(YEAR FROM sub.renewalCycleAnchor)) +
                  CASE WHEN (EXTRACT(MONTH FROM sub.cancelledAt) > EXTRACT(MONTH FROM sub.renewalCycleAnchor)) OR
                            (EXTRACT(MONTH FROM sub.cancelledAt) = EXTRACT(MONTH FROM sub.renewalCycleAnchor) AND
                             EXTRACT(DAY FROM sub.cancelledAt) >= EXTRACT(DAY FROM sub.renewalCycleAnchor))
                       THEN 1 ELSE 0 END
                 ) || ' years')::INTERVAL
               ) >= CURRENT_TIMESTAMP))`,
          )
          .getQuery();

        if (filters.hasActiveSubscription === true) {
          // Filter for orgs WITH an active subscription
          queryBuilder.andWhere(`org.id IN ${activeSubscriptionSubquery}`);
        } else {
          // Filter for orgs WITHOUT an active subscription
          queryBuilder.andWhere(`org.id NOT IN ${activeSubscriptionSubquery}`);
        }
      }

      // Apply pagination and get data with count in one call
      // getManyAndCount() automatically uses COUNT(DISTINCT org.id) for correct totals with joins
      const [orgRecords, total] = await queryBuilder
        .skip(pagination.offset)
        .take(pagination.limit)
        .getManyAndCount();

      const orgs = orgRecords.map((record) => OrgMapper.toDomain(record));

      return new Paginated<Org>({
        data: orgs,
        limit: pagination.limit,
        offset: pagination.offset,
        total,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Failed to retrieve organizations for super admin', {
        error: err,
      });
      throw new OrgRetrievalFailedError(err.message);
    }
  }

  async create(org: Org): Promise<Org> {
    this.logger.log('create', { id: org.id, name: org.name });

    try {
      const orgEntity = OrgMapper.toEntity(org);
      const savedOrgEntity = await this.orgRepository.save(orgEntity);

      this.logger.debug('Organization created successfully', {
        id: savedOrgEntity.id,
        name: savedOrgEntity.name,
      });

      return OrgMapper.toDomain(savedOrgEntity);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error creating organization', {
        error: err,
        id: org.id,
        name: org.name,
      });

      throw new OrgCreationFailedError(
        `Failed to create organization: ${err.message}`,
      );
    }
  }

  async update(org: Org): Promise<Org> {
    this.logger.log('update', { id: org.id, name: org.name });

    try {
      // Verify org exists
      const existingOrg = await this.orgRepository.findOne({
        where: { id: org.id },
      });

      if (!existingOrg) {
        this.logger.warn('Attempted to update non-existent organization', {
          id: org.id,
        });
        throw new OrgNotFoundError(org.id);
      }

      const orgEntity = OrgMapper.toEntity(org);
      const savedOrgEntity = await this.orgRepository.save(orgEntity);

      this.logger.debug('Organization updated successfully', {
        id: savedOrgEntity.id,
        name: savedOrgEntity.name,
      });

      return OrgMapper.toDomain(savedOrgEntity);
    } catch (error) {
      if (error instanceof OrgNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error updating organization', {
        error: err,
        id: org.id,
        name: org.name,
      });

      throw new OrgUpdateFailedError(org.id, err.message);
    }
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    try {
      // Verify org exists
      const existingOrg = await this.orgRepository.findOne({
        where: { id },
      });

      if (!existingOrg) {
        this.logger.warn('Attempted to delete non-existent organization', {
          id,
        });
        throw new OrgNotFoundError(id);
      }

      await this.orgRepository.delete(id);
      this.logger.debug('Organization deleted successfully', { id });
    } catch (error) {
      if (error instanceof OrgNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error deleting organization', { error: err, id });
      throw new OrgDeletionFailedError(id, err.message);
    }
  }
}
