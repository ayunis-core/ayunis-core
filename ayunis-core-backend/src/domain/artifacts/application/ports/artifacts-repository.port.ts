import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import type { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import type { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

export interface ArtifactsByWorkspaceListOptions {
  search?: string;
  type?: ArtifactType;
  limit: number;
  offset: number;
}

export abstract class ArtifactsRepository {
  abstract create(artifact: Artifact): Promise<Artifact>;
  abstract findById(id: UUID, userId: UUID): Promise<Artifact | null>;
  abstract findByThreadId(threadId: UUID, userId: UUID): Promise<Artifact[]>;
  abstract findByWorkspaceId(
    workspaceId: UUID,
    userId: UUID,
    options: ArtifactsByWorkspaceListOptions,
  ): Promise<Paginated<Artifact>>;
  abstract findByIdWithVersions(
    id: UUID,
    userId: UUID,
  ): Promise<Artifact | null>;
  abstract addVersion(version: ArtifactVersion): Promise<ArtifactVersion>;
  abstract updateCurrentVersionNumber(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<void>;
  /**
   * Atomically adds a version and updates the artifact row.
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
  }): Promise<ArtifactVersion>;
  abstract updateLetterheadId(
    artifactId: UUID,
    letterheadId: UUID | null,
  ): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
}
