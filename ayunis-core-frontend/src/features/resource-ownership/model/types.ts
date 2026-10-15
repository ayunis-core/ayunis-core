import type {
  OwnerDescriptionDto,
  OwnerEditorDto,
  OwnerOptionDto,
  ResourceViewerDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type OwnedResourceKind = 'skill' | 'knowledge_base';

export type OwnerChoice =
  | { ownerType: 'personal' }
  | { ownerType: 'team'; teamId: string }
  | { ownerType: 'org' };

export interface OwnedResource {
  ownerType: 'personal' | 'workspace' | 'team' | 'org';
  userId?: string;
  viewer?: ResourceViewerDto;
  ownerDescription?: OwnerDescriptionDto;
}

export type OwnerOption = OwnerOptionDto;
export type OwnerEditor = OwnerEditorDto;
