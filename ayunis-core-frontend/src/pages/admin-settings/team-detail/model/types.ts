import type {
  TeamResponseDto,
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type TeamDetail = TeamResponseDto;
export type TeamMember = TeamMemberResponseDto;
export type PaginatedTeamMembers = PaginatedTeamMembersResponseDto;
