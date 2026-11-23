import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ArtifactVersion } from './artifact-version.entity';
import type { ArtifactPiiMask } from './artifact-pii-mask.entity';
import { ArtifactType } from './value-objects/artifact-type.enum';

interface ArtifactParams {
  id?: UUID;
  threadId: UUID;
  userId: UUID;
  title: string;
  isAnonymous?: boolean;
  currentVersionNumber?: number;
  versions?: ArtifactVersion[];
  piiMasks?: ArtifactPiiMask[];
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class Artifact {
  public readonly id: UUID;
  public readonly type: ArtifactType;
  public readonly threadId: UUID;
  public readonly userId: UUID;
  public readonly title: string;
  /**
   * Created in an anonymous run: its content holds `{{pii:…}}` placeholders
   * whose real values live in its own dictionary (`piiMasks`).
   */
  public readonly isAnonymous: boolean;
  public readonly currentVersionNumber: number;
  public readonly versions: ArtifactVersion[];
  /** The artifact's own mask dictionary; loaded together with the versions. */
  public readonly piiMasks: ArtifactPiiMask[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  protected constructor(params: ArtifactParams & { type: ArtifactType }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.title = params.title;
    this.isAnonymous = params.isAnonymous ?? false;
    this.currentVersionNumber = params.currentVersionNumber ?? 1;
    this.versions = params.versions ?? [];
    this.piiMasks = params.piiMasks ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

export class DocumentArtifact extends Artifact {
  public readonly letterheadId: UUID | null;

  constructor(params: ArtifactParams & { letterheadId?: UUID | null }) {
    super({ ...params, type: ArtifactType.DOCUMENT });
    this.letterheadId = params.letterheadId ?? null;
  }
}

export class DiagramArtifact extends Artifact {
  constructor(params: ArtifactParams) {
    super({ ...params, type: ArtifactType.DIAGRAM });
  }
}

export class SpreadsheetArtifact extends Artifact {
  constructor(params: ArtifactParams) {
    super({ ...params, type: ArtifactType.SPREADSHEET });
  }
}
