import { Injectable, Logger } from '@nestjs/common';
import {
  OrgsRepository,
  OrgsPagination,
  OrgsFilters,
  OrgSubscriptionFilter,
} from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  Brackets,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { isUUID } from 'class-validator';
import { OrgRecord } from './schema/org.record';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { OrgMapper } from './mappers/org.mapper';
import { UUID } from 'crypto';
import {
  OrgNotFoundError,
  OrgCreationFailedError,
  OrgUpdateFailedError,
  OrgRetrievalFailedError,
} from 'src/iam/orgs/application/orgs.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class LocalOrgsRepository extends OrgsRepository {
  private readonly logger = new Logger(LocalOrgsRepository.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
    this.logger.log('constructor');
  }

  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get orgRepository(): Repository<OrgRecord> {
    return this.getManager().getRepository(OrgRecord);
  }

  async findById(id: UUID, lockForLifecycle = false): Promise<Org> {
    this.logger.log({ id }, 'findById');

    try {
      const orgEntity = await this.orgRepository.findOne({
        where: { id },
        ...(lockForLifecycle
          ? { lock: { mode: 'pessimistic_read' as const } }
          : {}),
      });
      if (!orgEntity) {
        this.logger.warn({ id }, 'Organization not found');
        throw new OrgNotFoundError(id);
      }

      this.logger.debug({ id, name: orgEntity.name }, 'Organization found');
      return OrgMapper.toDomain(orgEntity);
    } catch (error) {
      if (error instanceof OrgNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error({ err, id }, 'Error finding organization');
      throw new OrgRetrievalFailedError(err.message);
    }
  }

  async findByUserId(userId: UUID): Promise<Org> {
    this.logger.log({ userId }, 'findByUserId');

    const orgEntity = await this.orgRepository.findOne({
      where: { users: { id: userId } },
    });

    if (!orgEntity) {
      this.logger.warn({ userId }, 'Organization not found');
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

  private nameOrIdMatches(search: string): Brackets {
    return new Brackets((where) => {
      where.where('org.name ILIKE :search', { search: `%${search}%` });
      // org.id is varchar holding lower-case randomUUID() values, so normalize the
      // input instead of lower(org.id), which would bypass the primary-key index.
      if (isUUID(search)) {
        where.orWhere('org.id = :searchId', { searchId: search.toLowerCase() });
      }
    });
  }

  // Mirrors isActive() from the subscriptions module, which orgs cannot import
  // (the module graph would cycle through users). Legacy cancellations without
  // accessEndsAt keep access until the next renewal: usage-based ends at
  // cancellation, seat-based at the next anchor step after cancelledAt.
  // generate_series adds the interval to the previous value, so month-end
  // anchors clamp and stick exactly like getNextDate (Jan 31 -> Feb 28 -> Mar 28).
  private activeSubscriptionExists(
    queryBuilder: SelectQueryBuilder<OrgRecord>,
  ): string {
    const cycle = `(CASE s."renewalCycle" WHEN 'yearly' THEN interval '1 year' ELSE interval '1 month' END)`;
    const nextRenewalAfterCancellation = `(SELECT min(renewal) FROM generate_series(s."renewalCycleAnchor", s."cancelledAt" + ${cycle}, ${cycle}) AS renewal WHERE renewal > s."cancelledAt")`;
    const subQuery = queryBuilder
      .subQuery()
      .select('1')
      .from(SubscriptionRecord, 's')
      .where('s."orgId" = org.id')
      .andWhere('s."startsAt" <= :now')
      .andWhere(
        `(s."accessEndsAt" > :now OR (s."accessEndsAt" IS NULL AND (s."cancelledAt" IS NULL OR (s."cancelledAt" >= s."startsAt" AND CASE s.type WHEN 'SEAT_BASED' THEN ${nextRenewalAfterCancellation} > :now ELSE s."cancelledAt" > :now END))))`,
      );
    return `EXISTS ${subQuery.getQuery()}`;
  }

  private applySubscriptionFilter(
    queryBuilder: SelectQueryBuilder<OrgRecord>,
    subscription: OrgSubscriptionFilter = 'all',
  ): void {
    if (subscription === 'all') return;
    const exists = this.activeSubscriptionExists(queryBuilder);
    queryBuilder.andWhere(
      subscription === 'paying' ? exists : `NOT ${exists}`,
      { now: new Date() },
    );
  }

  private applySuperAdminFilters(
    queryBuilder: SelectQueryBuilder<OrgRecord>,
    filters?: OrgsFilters,
  ): void {
    if (filters?.status !== 'all') {
      queryBuilder.andWhere('org.archived = :archived', {
        archived: filters?.status === 'archived',
      });
    }

    const search = filters?.search?.trim();
    if (search) {
      queryBuilder.andWhere(this.nameOrIdMatches(search));
    }

    this.applySubscriptionFilter(queryBuilder, filters?.subscription);
  }

  async findAllForSuperAdmin(
    pagination: OrgsPagination,
    filters?: OrgsFilters,
  ): Promise<Paginated<Org>> {
    this.logger.log(
      {
        limit: pagination.limit,
        offset: pagination.offset,
        text: filters?.search,
      },
      'findAllForSuperAdmin',
    );

    try {
      const queryBuilder = this.orgRepository
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.users', 'users')
        .orderBy('org.createdAt', 'DESC');
      this.applySuperAdminFilters(queryBuilder, filters);

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
      this.logger.error(
        {
          err,
        },
        'Failed to retrieve organizations for super admin',
      );
      throw new OrgRetrievalFailedError(err.message);
    }
  }

  async findPayingOrgIds(orgIds: UUID[]): Promise<UUID[]> {
    if (orgIds.length === 0) return [];
    const queryBuilder = this.orgRepository
      .createQueryBuilder('org')
      .select('org.id', 'id')
      .where('org.id IN (:...orgIds)', { orgIds });
    queryBuilder.andWhere(this.activeSubscriptionExists(queryBuilder), {
      now: new Date(),
    });
    const rows = await queryBuilder.getRawMany<{ id: UUID }>();
    return rows.map((row) => row.id);
  }

  async create(org: Org): Promise<Org> {
    this.logger.log({ id: org.id, name: org.name }, 'create');

    try {
      const orgEntity = OrgMapper.toEntity(org);
      const savedOrgEntity = await this.orgRepository.save(orgEntity);

      this.logger.debug(
        {
          id: savedOrgEntity.id,
          name: savedOrgEntity.name,
        },
        'Organization created successfully',
      );

      return OrgMapper.toDomain(savedOrgEntity);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        {
          err,
          id: org.id,
          name: org.name,
        },
        'Error creating organization',
      );

      throw new OrgCreationFailedError(
        `Failed to create organization: ${err.message}`,
      );
    }
  }

  async updateName(id: UUID, name: string): Promise<Org> {
    this.logger.log({ id, name }, 'updateName');

    try {
      // Targeted UPDATE ... RETURNING instead of save(): the org record's
      // `users` relation cascades, so persisting a mapped OrgRecord loaded
      // without its users would rewrite org membership.
      const result = await this.orgRepository
        .createQueryBuilder()
        .update(OrgRecord)
        .set({ name })
        .where('id = :id', { id })
        .returning('*')
        .execute();

      const updatedRecord = (result.raw as OrgRecord[]).at(0);
      if (!updatedRecord) {
        this.logger.warn(
          { id },
          'Attempted to update non-existent organization',
        );
        throw new OrgNotFoundError(id);
      }

      this.logger.debug(
        {
          id: updatedRecord.id,
          name: updatedRecord.name,
        },
        'Organization updated successfully',
      );

      return OrgMapper.toDomain(updatedRecord);
    } catch (error) {
      if (error instanceof OrgNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        {
          err,
          id,
          name,
        },
        'Error updating organization',
      );

      throw new OrgUpdateFailedError(id, err.message);
    }
  }

  async updateUsageVisibility(
    id: UUID,
    hideIndividualUsage: boolean,
  ): Promise<Org> {
    const result = await this.orgRepository
      .createQueryBuilder()
      .update(OrgRecord)
      .set({ hideIndividualUsage })
      .where('id = :id', { id })
      .returning('*')
      .execute();
    const record = (result.raw as OrgRecord[]).at(0);
    if (!record) throw new OrgNotFoundError(id);
    return OrgMapper.toDomain(record);
  }

  async updateArchived(id: UUID, archived: boolean): Promise<Org> {
    const result = await this.orgRepository
      .createQueryBuilder()
      .update(OrgRecord)
      .set({
        archived,
        sessionVersion: () =>
          archived
            ? '"sessionVersion" + CASE WHEN "archived" = false THEN 1 ELSE 0 END'
            : '"sessionVersion"',
      })
      .where('id = :id', { id })
      .returning('*')
      .execute();
    const record = (result.raw as OrgRecord[]).at(0);
    if (!record) throw new OrgNotFoundError(id);
    return OrgMapper.toDomain(record);
  }

  async lockForLifecycleMutation(id: UUID): Promise<void> {
    try {
      const record = await this.orgRepository.findOne({
        select: { id: true },
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) throw new OrgNotFoundError(id);
    } catch (error) {
      if (error instanceof OrgNotFoundError) throw error;
      const err = error instanceof Error ? error : new Error('Unknown error');
      throw new OrgRetrievalFailedError(err.message);
    }
  }

  async delete(id: UUID, confirmationName?: string): Promise<void> {
    const result = await this.orgRepository.delete({
      id,
      ...(confirmationName !== undefined ? { name: confirmationName } : {}),
    });
    if (!result.affected) throw new OrgNotFoundError(id);
  }
}
