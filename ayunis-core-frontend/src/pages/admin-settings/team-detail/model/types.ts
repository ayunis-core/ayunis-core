import type {
  TeamResponseDto,
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
  PermittedLanguageModelResponseDto,
  TeamRolePermissionSetDto,
} from '@ayunis/api-client/schemas';
import { UpdateTeamMemberRoleDtoRole } from '@ayunis/api-client/schemas';

export type TeamDetail = TeamResponseDto;
export type TeamMember = TeamMemberResponseDto;
export type PaginatedTeamMembers = PaginatedTeamMembersResponseDto;
export type TeamPermittedModel = PermittedLanguageModelResponseDto;
export type TeamRole = UpdateTeamMemberRoleDtoRole;
export type TeamRolePermissionSet = TeamRolePermissionSetDto;

export const TEAM_ROLES: readonly TeamRole[] = [
  UpdateTeamMemberRoleDtoRole.user,
  UpdateTeamMemberRoleDtoRole.manager,
  UpdateTeamMemberRoleDtoRole.admin,
];
