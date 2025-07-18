import { Injectable } from '@nestjs/common';
import { Invite } from '../../../domain/invite.entity';
import {
  InviteResponseDto,
  InviteStatus,
  InviteDetailResponseDto,
  AcceptInviteResponseDto,
} from '../dtos/invite-response.dto';
import { InviteWithOrgDetails } from '../../../application/use-cases/get-invite-by-token/get-invite-by-token.use-case';

@Injectable()
export class InviteResponseMapper {
  toDto(invite: Invite): InviteResponseDto {
    const status = this.calculateStatus(invite);

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status,
      sentDate: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
    };
  }

  toDtoArray(invites: Invite[]): InviteResponseDto[] {
    return invites.map((invite) => this.toDto(invite));
  }

  toDetailDto(inviteWithOrg: InviteWithOrgDetails): InviteDetailResponseDto {
    return {
      id: inviteWithOrg.id,
      email: inviteWithOrg.email,
      role: inviteWithOrg.role,
      status: inviteWithOrg.status,
      sentDate: inviteWithOrg.sentDate,
      expiresAt: inviteWithOrg.expiresAt,
      acceptedAt: inviteWithOrg.acceptedAt,
      organizationName: inviteWithOrg.organizationName,
    };
  }

  toAcceptResponseDto(data: {
    inviteId: string;
    email: string;
    orgId: string;
  }): AcceptInviteResponseDto {
    return {
      inviteId: data.inviteId,
      email: data.email,
      orgId: data.orgId,
    };
  }

  private calculateStatus(invite: Invite): InviteStatus {
    if (invite.acceptedAt) {
      return InviteStatus.ACCEPTED;
    } else if (invite.expiresAt < new Date()) {
      return InviteStatus.EXPIRED;
    } else {
      return InviteStatus.PENDING;
    }
  }
}
