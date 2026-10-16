import type {
  HandoverRequestDto,
  HandoverResourceType,
  HandoverTargetDto,
  HandoverTargetRefDto,
  OwnerEditorDto,
  PendingHandoverDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type HandoverKind = HandoverResourceType;
export type HandoverTarget = HandoverTargetDto;
export type HandoverTargetRef = HandoverTargetRefDto;
export type HandoverRequest = HandoverRequestDto;
export type PendingHandover = PendingHandoverDto;
export type HandoverPerson = OwnerEditorDto;

export interface HandoverItem {
  id: string;
  name: string;
}

export interface CopyKey {
  key: string;
  values?: Record<string, string | number>;
}
