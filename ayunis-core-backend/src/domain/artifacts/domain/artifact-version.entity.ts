import { randomUUID, UUID } from 'crypto';
import { AuthorType } from './value-objects/author-type.enum';

export class ArtifactVersion {
  public readonly id: UUID;
  public readonly artifactId: UUID;
  public readonly versionNumber: number;
  public readonly content: string;
  public readonly authorType: AuthorType;
  public readonly authorId: UUID | null;
  public readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    artifactId: UUID;
    versionNumber: number;
    content: string;
    authorType: AuthorType;
    authorId?: UUID | null;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.artifactId = params.artifactId;
    this.versionNumber = params.versionNumber;
    this.content = params.content;
    this.authorType = params.authorType;
    this.authorId = params.authorId ?? null;
    this.createdAt = params.createdAt ?? new Date();
  }
}
