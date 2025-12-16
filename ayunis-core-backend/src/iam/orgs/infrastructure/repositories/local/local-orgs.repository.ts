import { Injectable, Logger } from '@nestjs/common';
import {
  OrgsRepository,
  FindAllForSuperAdminOptions,
} from '../../../application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
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
import { Paginated } from 'src/common/pagination';

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

  async findAllForSuperAdmin(): Promise<Org[]> {
    this.logger.log('findAllForSuperAdmin', {});

    try {
      const findOptions: FindManyOptions<OrgRecord> = {
        order: { createdAt: 'DESC' },
        relations: { users: true },
      };

      const orgRecords = await this.orgRepository.find(findOptions);

      return orgRecords.map((record) => OrgMapper.toDomain(record));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Failed to retrieve organizations for super admin', {
        error: err,
      });
      throw new OrgRetrievalFailedError(err.message);
    }
  }

  async findAllForSuperAdminPaginated(
    options?: FindAllForSuperAdminOptions,
  ): Promise<Paginated<Org>> {
    this.logger.log('findAllForSuperAdminPaginated', { options });

    const limit = options?.limit ?? 25;
    const offset = options?.offset ?? 0;

    try {
      const queryBuilder = this.orgRepository
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.users', 'users');

      if (options?.search) {
        queryBuilder.andWhere('org.name ILIKE :search', {
          search: `%${options.search}%`,
        });
      }

      queryBuilder.orderBy('org.createdAt', 'DESC').skip(offset).take(limit);

      const [orgRecords, total] = await queryBuilder.getManyAndCount();

      this.logger.debug('Found organizations (paginated)', {
        count: orgRecords.length,
        total,
      });

      return new Paginated({
        data: orgRecords.map((record) => OrgMapper.toDomain(record)),
        limit,
        offset,
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
