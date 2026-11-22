import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import type { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import type { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import type { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

export interface ArtifactsByWorkspaceListOptions {
  search?: string;
  type?: ArtifactType;
  limit: number;
  offset: number;
}

export interface ArtifactLookupOptions {
  linkedThreadId?: UUID;
  isAnonymous?: boolean;
}

export abstract class ArtifactsRepository {
  abstract create(artifact: Artifact): Promise<Artifact>;
  abstract addThreadLink(threadId: UUID, artifactId: UUID): Promise<void>;
  abstract findById(
    id: UUID,
    userId: UUID,
    options?: ArtifactLookupOptions,
  ): Promise<Artifact | null>;
  /**
   * The artifacts linked to the chat; with `isAnonymous`, only those of that
   * mode, anonymous ones loaded with their mask dictionaries.
   */
  abstract findByThreadId(
    threadId: UUID,
    userId: UUID,
    options?: Pick<ArtifactLookupOptions, 'isAnonymous'>,
  ): Promise<Artifact[]>;
  abstract findByWorkspaceId(
    workspaceId: UUID,
    userId: UUID,
    options: ArtifactsByWorkspaceListOptions,
  ): Promise<Paginated<Artifact>>;
  /** Also loads the artifact's mask dictionary when it is anonymous. */
  abstract findByIdWithVersions(
    id: UUID,
    userId: UUID,
    options?: ArtifactLookupOptions,
  ): Promise<Artifact | null>;
  abstract findPiiMasks(artifactId: UUID): Promise<ArtifactPiiMask[]>;
  abstract addPiiMasks(masks: ArtifactPiiMask[]): Promise<void>;
  abstract findVersion(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<ArtifactVersion | null>;
  abstract addVersion(version: ArtifactVersion): Promise<ArtifactVersion>;
  abstract updateCurrentVersionNumber(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<void>;
  /**
   * Atomically adds a version, the new entries of the artifact's mask
   * dictionary it needs, and updates the artifact row.
   * Each call runs in its own transaction so that a unique-constraint failure
   * does not poison the caller's transaction context.
   *
   * @throws ArtifactVersionConflictError when the version number already exists
   * or when the artifact was concurrently modified.
   */
  abstract addVersionAndUpdateArtifact(params: {
    version: ArtifactVersion;
    expectedCurrentVersionNumber: number;
    letterheadId?: UUID | null;
    piiMasks?: ArtifactPiiMask[];
  }): Promise<ArtifactVersion>;
  abstract updateLetterheadId(
    artifactId: UUID,
    letterheadId: UUID | null,
  ): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
}
