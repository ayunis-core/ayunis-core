import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ArtifactVersion } from './artifact-version.entity';
import { ArtifactType } from './value-objects/artifact-type.enum';

export abstract class Artifact {
  public readonly id: UUID;
  public readonly type: ArtifactType;
  public readonly threadId: UUID;
  public readonly userId: UUID;
  public readonly title: string;
  public readonly currentVersionNumber: number;
  public readonly versions: ArtifactVersion[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  protected constructor(params: {
    id?: UUID;
    type: ArtifactType;
    threadId: UUID;
    userId: UUID;
    title: string;
    currentVersionNumber?: number;
    versions?: ArtifactVersion[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.title = params.title;
    this.currentVersionNumber = params.currentVersionNumber ?? 1;
    this.versions = params.versions ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

export class DocumentArtifact extends Artifact {
  public readonly letterheadId: UUID | null;

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
    super({ ...params, type: ArtifactType.DOCUMENT });
    this.letterheadId = params.letterheadId ?? null;
  }
}

export class DiagramArtifact extends Artifact {
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
    super({ ...params, type: ArtifactType.DIAGRAM });
  }
}

export class JsxArtifact extends Artifact {
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
    super({ ...params, type: ArtifactType.JSX });
  }
}
