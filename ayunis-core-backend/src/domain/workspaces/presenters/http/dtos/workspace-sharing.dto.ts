import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  WORKSPACE_GRANT_LEVELS,
  type WorkspaceAccessLevel,
  type WorkspaceGrantLevel,
} from 'src/domain/workspaces/domain/workspace-access-level';

const ACCESS_LEVELS = ['owner', 'full', 'edit', 'use'];

export class ShareWorkspaceDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  userIds: UUID[];

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  teamIds: UUID[];

  @ApiProperty({ enum: WORKSPACE_GRANT_LEVELS })
  @IsIn(WORKSPACE_GRANT_LEVELS)
  accessLevel: WorkspaceGrantLevel;
}

export class SetWorkspaceMemberAccessDto {
  @ApiProperty({ enum: WORKSPACE_GRANT_LEVELS })
  @IsIn(WORKSPACE_GRANT_LEVELS)
  accessLevel: WorkspaceGrantLevel;

  @ApiPropertyOptional({
    type: 'string',
    format: 'uuid',
    description: 'The team section the change was made in',
  })
  @IsOptional()
  @IsUUID()
  teamId?: UUID;
}

export class RemoveWorkspaceMemberQueryDto {
  @ApiPropertyOptional({
    type: 'string',
    format: 'uuid',
    description: 'The team section the person was removed from',
  })
  @IsOptional()
  @IsUUID()
  teamId?: UUID;
}

export class SetWorkspaceOrganizationSharingDto {
  @ApiProperty()
  @IsBoolean()
  shared: boolean;
}

export class SharingChangeResponseDto {
  @ApiProperty({
    description:
      'Own skills and knowledge collections of people who lost access that were unlinked',
  })
  unlinkedCount: number;
}

export class SharingMemberDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  userId: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Primary team of the person; null without a team',
  })
  affiliation: string | null;

  @ApiProperty({ enum: ACCESS_LEVELS })
  accessLevel: WorkspaceAccessLevel;

  @ApiProperty()
  isOwner: boolean;

  @ApiProperty({ description: 'Whether the caller may change or remove them' })
  canChange: boolean;
}

export class SharingTeamDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  teamId: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ACCESS_LEVELS })
  accessLevel: WorkspaceAccessLevel;

  @ApiProperty({
    description: 'Everyone in the team who has access through it',
  })
  memberCount: number;

  @ApiProperty({
    type: [SharingMemberDto],
    description:
      'Members shown in this section; a person shows in their first granted team only',
  })
  members: SharingMemberDto[];

  @ApiProperty({
    description:
      'Whether the caller may end the team share without losing their own access',
  })
  canEnd: boolean;
}

export class SharingOrganizationDto {
  @ApiProperty()
  memberCount: number;

  @ApiProperty({ type: [SharingMemberDto] })
  members: SharingMemberDto[];
}

export class SharingViewerDto {
  @ApiProperty({ enum: ACCESS_LEVELS })
  accessLevel: WorkspaceAccessLevel;

  @ApiProperty()
  canInvite: boolean;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: 'Teams the caller may invite from; null means everyone',
  })
  inviteScopeTeamIds: UUID[] | null;

  @ApiProperty()
  canShareWithOrganization: boolean;
}

export class SharingInvitersDto {
  @ApiProperty({ description: 'Managers hold "Arbeitsbereiche verwalten"' })
  managers: boolean;

  @ApiProperty({
    description: 'Team admins may invite their own teams',
  })
  teamAdmins: boolean;
}

export class WorkspaceSharingResponseDto {
  @ApiProperty()
  isSharedWithOrganization: boolean;

  @ApiProperty({ description: 'Everyone with access, the owner included' })
  memberCount: number;

  @ApiProperty({ type: SharingViewerDto })
  viewer: SharingViewerDto;

  @ApiProperty({ type: SharingMemberDto })
  owner: SharingMemberDto;

  @ApiProperty({
    type: [SharingMemberDto],
    description: 'People invited directly who are not shown in a team',
  })
  people: SharingMemberDto[];

  @ApiProperty({ type: [SharingTeamDto] })
  teams: SharingTeamDto[];

  @ApiProperty({ type: SharingOrganizationDto, nullable: true })
  organization: SharingOrganizationDto | null;

  @ApiProperty({
    type: SharingInvitersDto,
    description: 'Who besides admins may invite people in this organisation',
  })
  inviters: SharingInvitersDto;
}

export class ShareCandidateTeamDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  teamId: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty()
  memberCount: number;

  @ApiProperty({ type: [String], format: 'uuid' })
  memberIds: UUID[];
}

export class ShareCandidateTeamRefDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  id: UUID;

  @ApiProperty()
  name: string;
}

export class ShareCandidatePersonDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  userId: UUID;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: ShareCandidateTeamRefDto, nullable: true })
  primaryTeam: ShareCandidateTeamRefDto | null;
}

export class ShareCandidateOrganizationDto {
  @ApiProperty()
  memberCount: number;
}

export class ShareCandidatesResponseDto {
  @ApiProperty({ type: ShareCandidateOrganizationDto, nullable: true })
  organization: ShareCandidateOrganizationDto | null;

  @ApiProperty({ type: [ShareCandidateTeamDto] })
  teams: ShareCandidateTeamDto[];

  @ApiProperty({ type: [ShareCandidatePersonDto] })
  people: ShareCandidatePersonDto[];
}
