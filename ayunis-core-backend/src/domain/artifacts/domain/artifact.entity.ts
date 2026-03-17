import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ArtifactVersion } from './artifact-version.entity';

export class Artifact {
  public readonly id: UUID;
  public readonly threadId: UUID;
  public readonly userId: UUID;
  public readonly title: string;
  public readonly letterheadId: UUID | null;
  public readonly currentVersionNumber: number;
  public readonly versions: ArtifactVersion[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    threadId: UUID;
    userId: UUID;
    title: string;
    letterheadId?: UUID | null;
    currentVersionNumber?: number;
    versions?: ArtifactVersion[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.title = params.title;
    this.letterheadId = params.letterheadId ?? null;
    this.currentVersionNumber = params.currentVersionNumber ?? 1;
    this.versions = params.versions ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
