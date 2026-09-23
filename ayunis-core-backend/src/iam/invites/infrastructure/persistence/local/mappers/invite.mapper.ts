import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { InviteTeamRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite-team.record';

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
      teamIds: entity.inviteTeams?.map((inviteTeam) => inviteTeam.teamId),
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
    entity.inviteTeams = domain.teamIds.map((teamId) => {
      const inviteTeam = new InviteTeamRecord();
      inviteTeam.id = randomUUID();
      inviteTeam.inviteId = domain.id;
      inviteTeam.teamId = teamId;
      return inviteTeam;
    });
    return entity;
  }
}
