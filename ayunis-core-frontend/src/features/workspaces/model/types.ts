import type { WorkspaceResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type Workspace = WorkspaceResponseDto;

export interface WorkspaceFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
}
