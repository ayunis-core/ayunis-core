import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';

export class WorkspaceSharingUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ format: 'email' })
  email: string;
}

export class WorkspaceSharingMemberDto {
  @ApiProperty({ type: WorkspaceSharingUserDto })
  user: WorkspaceSharingUserDto;

  @ApiProperty({ enum: WorkspaceAccessLevel })
  accessLevel: WorkspaceAccessLevel;

  @ApiProperty({ enum: WorkspaceMemberStatus })
  status: WorkspaceMemberStatus;
}

export class WorkspaceSharingOverrideDto {
  @ApiProperty({ type: WorkspaceSharingUserDto })
  user: WorkspaceSharingUserDto;

  @ApiProperty({ enum: WorkspaceAccessLevel, nullable: true })
  accessLevel: WorkspaceAccessLevel | null;

  @ApiProperty()
  excluded: boolean;
}

export class WorkspaceSharingAvailableTeamDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  memberCount: number;
}

export class WorkspaceSharingTeamGrantDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  memberCount: number;

  @ApiProperty({ enum: WorkspaceAccessLevel })
  accessLevel: WorkspaceAccessLevel;

  @ApiProperty({ type: [WorkspaceSharingOverrideDto] })
  overrides: WorkspaceSharingOverrideDto[];
}

export class WorkspaceSharingResponseDto {
  @ApiProperty({ enum: WorkspaceVisibility })
  visibility: WorkspaceVisibility;

  @ApiProperty({ type: WorkspaceSharingUserDto })
  owner: WorkspaceSharingUserDto;

  @ApiProperty({ type: [WorkspaceSharingAvailableTeamDto] })
  availableTeams: WorkspaceSharingAvailableTeamDto[];

  @ApiProperty({ type: [WorkspaceSharingMemberDto] })
  members: WorkspaceSharingMemberDto[];

  @ApiProperty({ type: [WorkspaceSharingTeamGrantDto] })
  teamGrants: WorkspaceSharingTeamGrantDto[];
}
