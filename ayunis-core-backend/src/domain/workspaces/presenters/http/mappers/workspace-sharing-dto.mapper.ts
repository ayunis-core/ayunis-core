import { Injectable } from '@nestjs/common';
import type { WorkspaceInvitation } from 'src/domain/workspaces/application/ports/workspace-invitations-read-repository.port';
import type {
  WorkspaceSharingOverrideView,
  WorkspaceSharingView,
} from 'src/domain/workspaces/application/use-cases/get-workspace-sharing/workspace-sharing.view';
import type { User } from 'src/iam/users/domain/user.entity';
import type { WorkspaceInvitationResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-invitation-response.dto';
import type {
  WorkspaceSharingOverrideDto,
  WorkspaceSharingResponseDto,
  WorkspaceSharingUserDto,
} from 'src/domain/workspaces/presenters/http/dtos/workspace-sharing-response.dto';

@Injectable()
export class WorkspaceSharingDtoMapper {
  toSharingDto(view: WorkspaceSharingView): WorkspaceSharingResponseDto {
    return {
      visibility: view.visibility,
      owner: this.toUserDto(view.owner),
      availableTeams: view.availableTeams.map(({ team, memberCount }) => ({
        id: team.id,
        name: team.name,
        memberCount,
      })),
      members: view.members.map((member) => ({
        user: this.toUserDto(member.user),
        accessLevel: member.accessLevel,
        status: member.status,
      })),
      teamGrants: view.teamGrants.map((grant) => ({
        id: grant.team.id,
        name: grant.team.name,
        memberCount: grant.memberCount,
        accessLevel: grant.accessLevel,
        overrides: grant.overrides.map((override) =>
          this.toOverrideDto(override),
        ),
      })),
    };
  }

  toInvitationDto(
    invitation: WorkspaceInvitation,
  ): WorkspaceInvitationResponseDto {
    return {
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        icon: invitation.workspace.icon,
        color: invitation.workspace.color,
      },
      accessLevel: invitation.accessLevel,
    };
  }

  toUserDtos(users: User[]): WorkspaceSharingUserDto[] {
    return users.map((user) => this.toUserDto(user));
  }

  private toUserDto(user: User): WorkspaceSharingUserDto {
    return { id: user.id, name: user.name, email: user.email };
  }

  private toOverrideDto(
    override: WorkspaceSharingOverrideView,
  ): WorkspaceSharingOverrideDto {
    return {
      user: this.toUserDto(override.user),
      accessLevel: override.accessLevel,
      excluded: override.excluded,
    };
  }
}
