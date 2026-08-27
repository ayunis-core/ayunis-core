import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { EntityManager, Repository, IsNull } from 'typeorm';
import { UUID } from 'crypto';
import {
  InvitesRepository,
  InvitesPagination,
  InvitesFilters,
} from 'src/iam/invites/application/ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { InviteMapper } from 'src/iam/invites/infrastructure/persistence/local/mappers/invite.mapper';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { exactEmail } from 'src/common/db/exact-email.operator';

@Injectable()
export class LocalInvitesRepository implements InvitesRepository {
  constructor(
    @InjectPinoLogger(LocalInvitesRepository.name)
    private readonly logger: PinoLogger,
    private readonly inviteMapper: InviteMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  // Outside an active transaction txHost.tx resolves to the adapter's fallback
  // instance (dataSource.manager), so this is safe without a null check.
  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get invites(): Repository<InviteRecord> {
    return this.getManager().getRepository(InviteRecord);
  }

  async create(invite: Invite): Promise<void> {
    this.logger.info(
      {
        inviteId: invite.id,
        email: invite.email,
        orgId: invite.orgId,
        role: invite.role,
        inviterId: invite.inviterId,
      },
      'create',
    );
    const entity = this.inviteMapper.toEntity(invite);
    await this.invites.save(entity);
    this.logger.debug({ inviteId: invite.id }, 'Invite created successfully');
  }

  async createMany(invites: Invite[]): Promise<void> {
    this.logger.info({ inviteCount: invites.length }, 'createMany');

    if (invites.length === 0) {
      return;
    }

    const entities = invites.map((invite) =>
      this.inviteMapper.toEntity(invite),
    );
    await this.invites.save(entities);

    this.logger.debug(
      {
        inviteCount: invites.length,
      },
      'Invites created successfully',
    );
  }

  async findOne(id: UUID): Promise<Invite | null> {
    this.logger.info({ id }, 'findOne');
    const entity = await this.invites.findOne({ where: { id } });

    if (!entity) {
      this.logger.debug({ id }, 'Invite not found');
      return null;
    }

    return this.inviteMapper.toDomain(entity);
  }

  async findByOrgIdPaginated(
    orgId: UUID,
    pagination: InvitesPagination,
    filters?: InvitesFilters,
  ): Promise<Paginated<Invite>> {
    this.logger.info(
      {
        orgId,
        limit: pagination.limit,
        offset: pagination.offset,
        input: filters?.search,
      },
      'findByOrgIdPaginated',
    );

    const queryBuilder = this.invites
      .createQueryBuilder('invite')
      .where('invite.orgId = :orgId', { orgId })
      .orderBy('invite.createdAt', 'DESC');

    if (filters?.onlyPending) {
      queryBuilder.andWhere('invite.acceptedAt IS NULL');
    }

    if (filters?.search) {
      queryBuilder.andWhere('invite.email ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder.skip(pagination.offset).take(pagination.limit);

    const inviteRecords = await queryBuilder.getMany();
    const invites = inviteRecords.map((record) =>
      this.inviteMapper.toDomain(record),
    );

    return new Paginated<Invite>({
      data: invites,
      limit: pagination.limit,
      offset: pagination.offset,
      total,
    });
  }

  async findOneByEmail(email: string): Promise<Invite | null> {
    this.logger.info({ email }, 'findOneByEmail');
    // Match the single invite row for this email regardless of acceptance
    // state. invites.email is globally unique, so there is at most one row.
    // Deletion paths (delete-user, delete-invite-by-email) rely on this to
    // clean up already-accepted invites; filtering on acceptedAt would leave
    // them orphaned and block re-inviting the same email (AYC-299).
    const entity = await this.invites.findOne({
      where: { email: exactEmail(email) },
    });
    if (!entity) {
      this.logger.debug({ email }, 'Invite not found by email');
      return null;
    }
    return this.inviteMapper.toDomain(entity);
  }

  async findOneByEmailAndOrg(
    email: string,
    orgId: UUID,
  ): Promise<Invite | null> {
    this.logger.info({ email, orgId }, 'findOneByEmailAndOrg');
    const entity = await this.invites.findOne({
      where: { email: exactEmail(email), orgId, acceptedAt: IsNull() },
    });
    if (!entity) {
      this.logger.debug({ email, orgId }, 'Invite not found by email and org');
      return null;
    }
    return this.inviteMapper.toDomain(entity);
  }

  async findByEmails(emails: string[]): Promise<Invite[]> {
    this.logger.info({ emailCount: emails.length }, 'findByEmails');

    if (emails.length === 0) {
      return [];
    }

    // invites.email carries a GLOBAL unique constraint, so at most one invite
    // row can exist per email across all orgs. Look invites up globally,
    // case-insensitively, and regardless of organization or acceptance status:
    // a pending invite in another org or an orphaned accepted invite is
    // invisible to an org-scoped lookup yet still makes the batch insert fail
    // with a DB unique violation, surfacing as a generic 500 instead of a
    // clear validation error (AYC-735).
    const lowerEmails = emails.map((e) => e.toLowerCase());

    const entities = await this.invites
      .createQueryBuilder('invite')
      .where('LOWER(invite.email) IN (:...emails)', { emails: lowerEmails })
      .getMany();

    this.logger.debug(
      {
        requestedCount: emails.length,
        foundCount: entities.length,
      },
      'Found invites by emails',
    );

    return entities.map((entity) => this.inviteMapper.toDomain(entity));
  }

  async accept(id: UUID): Promise<boolean> {
    this.logger.info({ id }, 'accept');

    const result = await this.invites.update(
      { id, acceptedAt: IsNull() },
      { acceptedAt: new Date() },
    );

    this.logger.debug({ id }, 'Invite accepted successfully');
    return result.affected === 1;
  }

  async delete(id: UUID): Promise<void> {
    this.logger.info({ id }, 'delete');
    await this.invites.delete(id);
    this.logger.debug({ id }, 'Invite deleted successfully');
  }

  async deleteAllPendingByOrg(orgId: UUID): Promise<number> {
    this.logger.info({ orgId }, 'deleteAllPendingByOrg');

    const result = await this.invites.delete({
      orgId,
      acceptedAt: IsNull(), // Only delete pending invites (not accepted)
    });

    const deletedCount = result.affected ?? 0;
    this.logger.debug(
      {
        orgId,
        count: deletedCount,
      },
      'Pending invites deleted',
    );
    return deletedCount;
  }
}
