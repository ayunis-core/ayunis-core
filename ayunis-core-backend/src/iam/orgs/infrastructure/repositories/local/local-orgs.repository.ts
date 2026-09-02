import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  OrgsRepository,
  OrgsPagination,
  OrgsFilters,
} from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { EntityManager, Repository } from 'typeorm';
import { OrgRecord } from './schema/org.record';
import { OrgMapper } from './mappers/org.mapper';
import { UUID } from 'crypto';
import {
  OrgNotFoundError,
  OrgCreationFailedError,
  OrgUpdateFailedError,
  OrgDeletionFailedError,
  OrgRetrievalFailedError,
} from 'src/iam/orgs/application/orgs.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class LocalOrgsRepository extends OrgsRepository {
  constructor(
    @InjectPinoLogger(LocalOrgsRepository.name)
    private readonly logger: PinoLogger,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
    this.logger.info('constructor');
  }

  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get orgRepository(): Repository<OrgRecord> {
    return this.getManager().getRepository(OrgRecord);
  }

  async findById(id: UUID): Promise<Org> {
    this.logger.info({ id }, 'findById');

    try {
      const orgEntity = await this.orgRepository.findOne({
        where: { id },
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
      throw new OrgNotFoundError(id);
    }
  }

  async findByUserId(userId: UUID): Promise<Org> {
    this.logger.info({ userId }, 'findByUserId');

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

  async findAllForSuperAdmin(
    pagination: OrgsPagination,
    filters?: OrgsFilters,
  ): Promise<Paginated<Org>> {
    this.logger.info(
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

      // Apply search filter (case-insensitive)
      if (filters?.search) {
        queryBuilder.andWhere('org.name ILIKE :search', {
          search: `%${filters.search}%`,
        });
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
      this.logger.error(
        {
          err,
        },
        'Failed to retrieve organizations for super admin',
      );
      throw new OrgRetrievalFailedError(err.message);
    }
  }

  async create(org: Org): Promise<Org> {
    this.logger.info({ id: org.id, name: org.name }, 'create');

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
    this.logger.info({ id, name }, 'updateName');

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

  async delete(id: UUID): Promise<void> {
    this.logger.info({ id }, 'delete');

    try {
      // Verify org exists
      const existingOrg = await this.orgRepository.findOne({
        where: { id },
      });

      if (!existingOrg) {
        this.logger.warn(
          {
            id,
          },
          'Attempted to delete non-existent organization',
        );
        throw new OrgNotFoundError(id);
      }

      await this.orgRepository.delete(id);
      this.logger.debug({ id }, 'Organization deleted successfully');
    } catch (error) {
      if (error instanceof OrgNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error({ err, id }, 'Error deleting organization');
      throw new OrgDeletionFailedError(id, err.message);
    }
  }
}
