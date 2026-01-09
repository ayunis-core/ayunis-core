import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { UUID } from 'crypto';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { InviteRecord } from './schema/invite.record';
import { InviteMapper } from './mappers/invite.mapper';

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

  async findByEmailsAndOrg(emails: string[], orgId: string): Promise<Invite[]> {
    this.logger.log('findByEmailsAndOrg', { emailCount: emails.length, orgId });

    if (emails.length === 0) {
      return [];
    }

    // Convert emails to lowercase for case-insensitive comparison
    const lowerEmails = emails.map((e) => e.toLowerCase());

    const entities = await this.inviteRepository
      .createQueryBuilder('invite')
      .where('invite.orgId = :orgId', { orgId })
      .andWhere('LOWER(invite.email) IN (:...emails)', { emails: lowerEmails })
      .andWhere('invite.acceptedAt IS NULL') // Only pending invites
      .getMany();

    this.logger.debug('Found invites by emails and org', {
      orgId,
      requestedCount: emails.length,
      foundCount: entities.length,
    });

    return entities.map((entity) => this.inviteMapper.toDomain(entity));
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

  async deleteAllPendingByOrg(orgId: UUID): Promise<number> {
    this.logger.log('deleteAllPendingByOrg', { orgId });

    const result = await this.inviteRepository.delete({
      orgId,
      acceptedAt: IsNull(), // Only delete pending invites (not accepted)
    });

    const deletedCount = result.affected ?? 0;
    this.logger.debug('Pending invites deleted', {
      orgId,
      count: deletedCount,
    });
    return deletedCount;
  }
}
