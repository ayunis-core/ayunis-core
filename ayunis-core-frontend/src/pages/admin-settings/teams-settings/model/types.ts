import type { TeamResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type Team = TeamResponseDto;

export interface CreateTeamFormData {
  name: string;
}
