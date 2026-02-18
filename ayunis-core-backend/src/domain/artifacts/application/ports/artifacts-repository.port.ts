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
  abstract delete(id: UUID): Promise<void>;
}
