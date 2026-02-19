import { UUID } from 'crypto';
import { Artifact } from '../../domain/artifact.entity';
import { ArtifactVersion } from '../../domain/artifact-version.entity';

export abstract class ArtifactsRepository {
  abstract create(artifact: Artifact): Promise<Artifact>;
  abstract findById(id: UUID, userId: UUID): Promise<Artifact | null>;
  abstract findByThreadId(threadId: UUID, userId: UUID): Promise<Artifact[]>;
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
   * Atomically adds a version and updates the artifact's current version number.
   * Each call runs in its own transaction so that a unique-constraint failure
   * does not poison the caller's transaction context.
   *
   * @throws ArtifactVersionConflictError when the version number already exists.
   */
  abstract addVersionAndUpdateCurrent(
    version: ArtifactVersion,
  ): Promise<ArtifactVersion>;
  abstract delete(id: UUID): Promise<void>;
}
