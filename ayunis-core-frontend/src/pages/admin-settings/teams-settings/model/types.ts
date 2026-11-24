import type { TeamResponseDto } from '@ayunis/api-client/schemas';

export type Team = TeamResponseDto;

export interface CreateTeamFormData {
  name: string;
}

export interface UpdateTeamFormData {
  name: string;
}
