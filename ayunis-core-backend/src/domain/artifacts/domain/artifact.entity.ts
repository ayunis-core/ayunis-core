import { randomUUID, UUID } from 'crypto';
import { ArtifactVersion } from './artifact-version.entity';

export class Artifact {
  public readonly id: UUID;
  public readonly threadId: UUID;
  public readonly userId: UUID;
  public readonly title: string;
  public readonly currentVersionNumber: number;
  public readonly versions: ArtifactVersion[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    threadId: UUID;
    userId: UUID;
    title: string;
    currentVersionNumber?: number;
    versions?: ArtifactVersion[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.title = params.title;
    this.currentVersionNumber = params.currentVersionNumber ?? 1;
    this.versions = params.versions ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
