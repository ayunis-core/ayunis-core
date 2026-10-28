import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { FavoriteReferenceType } from './value-objects/favorite-reference-type.enum';

export class Favorite {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly referenceType: FavoriteReferenceType;
  public readonly referenceId: UUID;
  public position: number;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    referenceType: FavoriteReferenceType;
    referenceId: UUID;
    position: number;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.referenceType = params.referenceType;
    this.referenceId = params.referenceId;
    this.position = params.position;
  }
}
