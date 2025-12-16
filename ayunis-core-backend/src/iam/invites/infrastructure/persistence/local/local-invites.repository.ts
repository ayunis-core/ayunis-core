import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { UUID } from 'crypto';
import {
  InvitesRepository,
  FindByOrgIdOptions,
} from 'src/iam/invites/application/ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { InviteRecord } from './schema/invite.record';
import { InviteMapper } from './mappers/invite.mapper';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class LocalInvitesRepository implements InvitesRepository {
  private readonly logger = new Logger(LocalInvitesRepository.name);

  constructor(
    @InjectRepository(InviteRecord)
    private readonly inviteRepository: Repository<InviteRecord>,
    private readonly inviteMapper: InviteMapper,
  ) {}

  async create(invite: Invite): Promise<void> {
    this.logger.log('create', {
      inviteId: invite.id,
      email: invite.email,
      orgId: invite.orgId,
      role: invite.role,
      inviterId: invite.inviterId,
    });
    const entity = this.inviteMapper.toEntity(invite);
    await this.inviteRepository.save(entity);
    this.logger.debug('Invite created successfully', { inviteId: invite.id });
  }

  async findOne(id: UUID): Promise<Invite | null> {
    this.logger.log('findOne', { id });
    const entity = await this.inviteRepository.findOne({ where: { id } });

    if (!entity) {
      this.logger.debug('Invite not found', { id });
      return null;
    }

    return this.inviteMapper.toDomain(entity);
  }

  async findByOrgId(orgId: UUID): Promise<Invite[]> {
    this.logger.log('findByOrgId', { orgId });
    const entities = await this.inviteRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });

    this.logger.debug('Found invites by org', {
      orgId,
      count: entities.length,
    });
    return entities.map((entity) => this.inviteMapper.toDomain(entity));
  }

  async findByOrgIdPaginated(
    orgId: UUID,
    options?: FindByOrgIdOptions,
  ): Promise<Paginated<Invite>> {
    this.logger.log('findByOrgIdPaginated', { orgId, options });

    const limit = options?.limit ?? 25;
    const offset = options?.offset ?? 0;

    const queryBuilder = this.inviteRepository
      .createQueryBuilder('invite')
      .where('invite.orgId = :orgId', { orgId });

    if (options?.search) {
      queryBuilder.andWhere('invite.email ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    queryBuilder.orderBy('invite.createdAt', 'DESC').skip(offset).take(limit);

    const [entities, total] = await queryBuilder.getManyAndCount();

    this.logger.debug('Found invites by org (paginated)', {
      orgId,
      count: entities.length,
      total,
    });

    return new Paginated({
      data: entities.map((entity) => this.inviteMapper.toDomain(entity)),
      limit,
      offset,
      total,
    });
  }

  async findOneByEmail(email: string): Promise<Invite | null> {
    this.logger.log('findOneByEmail', { email });
    const entity = await this.inviteRepository.findOne({
      where: { email: ILike(email) },
    });
    if (!entity) {
      this.logger.debug('Invite not found by email', { email });
      return null;
    }
    return this.inviteMapper.toDomain(entity);
  }

  async accept(id: UUID): Promise<void> {
    this.logger.log('accept', { id });

    await this.inviteRepository.update(id, {
      acceptedAt: new Date(),
    });

    this.logger.debug('Invite accepted successfully', { id });
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    await this.inviteRepository.delete(id);
    this.logger.debug('Invite deleted successfully', { id });
  }
}
