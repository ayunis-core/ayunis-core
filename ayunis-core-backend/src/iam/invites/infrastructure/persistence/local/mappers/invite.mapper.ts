import { Injectable } from '@nestjs/common';
import { Invite } from '../../../../domain/invite.entity';
import { InviteRecord } from '../schema/invite.record';

@Injectable()
export class InviteMapper {
  toDomain(entity: InviteRecord): Invite {
    return new Invite({
      id: entity.id,
      email: entity.email,
      orgId: entity.orgId,
      role: entity.role,
      inviterId: entity.inviterId,
      createdAt: entity.createdAt,
      acceptedAt: entity.acceptedAt,
      expiresAt: entity.expiresAt,
    });
  }

  toEntity(domain: Invite): InviteRecord {
    const entity = new InviteRecord();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.orgId = domain.orgId;
    entity.role = domain.role;
    entity.inviterId = domain.inviterId;
    entity.createdAt = domain.createdAt;
    entity.acceptedAt = domain.acceptedAt;
    entity.expiresAt = domain.expiresAt;
    return entity;
  }
}
