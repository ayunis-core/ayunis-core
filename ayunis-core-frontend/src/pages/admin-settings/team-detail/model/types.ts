import type {
  TeamResponseDto,
  TeamMemberResponseDto,
  PaginatedTeamMembersResponseDto,
  PermittedLanguageModelResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type TeamDetail = TeamResponseDto;
export type TeamMember = TeamMemberResponseDto;
export type PaginatedTeamMembers = PaginatedTeamMembersResponseDto;
export type TeamPermittedModel = PermittedLanguageModelResponseDto;
