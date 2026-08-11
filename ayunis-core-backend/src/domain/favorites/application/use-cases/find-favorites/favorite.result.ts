import type { UUID } from 'crypto';
import type { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';

interface FavoriteResultBase {
  id: UUID;
  position: number;
  referenceId: UUID;
}

export interface WorkspaceFavoriteResult extends FavoriteResultBase {
  referenceType: FavoriteReferenceType.Workspace;
  name: string;
  icon: string;
  color: string;
}

export interface ThreadFavoriteResult extends FavoriteResultBase {
  referenceType: FavoriteReferenceType.Thread;
  name: string | null;
  workspaceId: UUID | null;
}

export type FavoriteResult = WorkspaceFavoriteResult | ThreadFavoriteResult;
