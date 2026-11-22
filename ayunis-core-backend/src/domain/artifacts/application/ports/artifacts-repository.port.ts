import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import type { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import type { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import type { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import type { ArtifactOwner } from 'src/domain/artifacts/domain/artifact-owner';

export interface ArtifactListOptions {
  /** Matches the title as shown, with the real values of its placeholders. */
  search?: string;
  type?: ArtifactType;
  isAnonymous?: boolean;
  limit: number;
  offset: number;
}

/**
 * Lookups by user find personal artifacts for their owner and workspace
 * artifacts for the workspace's members; with `linkedThreadId`, only through
 * a link to that chat of the user.
 */
export interface ArtifactLookupOptions {
  linkedThreadId?: UUID;
  isAnonymous?: boolean;
}

export abstract class ArtifactsRepository {
  abstract create(artifact: Artifact): Promise<Artifact>;
  abstract addThreadLink(threadId: UUID, artifactId: UUID): Promise<void>;
  /**
   * Links the artifact to the user's chat, unless it is linked already, if
   * the chat's scope and mode still match the artifact's owner and mode.
   * Holds both rows while it checks, so a chat moving to another scope at the
   * same time either sees the link or makes it fail. Returns whether the
   * artifact is linked to the chat afterwards.
   */
  abstract linkToMatchingThread(
    threadId: UUID,
    artifactId: UUID,
    userId: UUID,
  ): Promise<boolean>;
  abstract findById(
    id: UUID,
    userId: UUID,
    options?: ArtifactLookupOptions,
  ): Promise<Artifact | null>;
  /**
   * The artifacts linked to the chat; with `isAnonymous`, only those of that
   * mode. Anonymous ones are loaded with their mask dictionaries.
   */
  abstract findByThreadId(
    threadId: UUID,
    userId: UUID,
    options?: Pick<ArtifactLookupOptions, 'isAnonymous'>,
  ): Promise<Artifact[]>;
  /**
   * The owner's artifacts, most recently changed first, anonymous ones with
   * their mask dictionaries; callers check access first.
   */
  abstract findByOwner(
    owner: ArtifactOwner,
    options: ArtifactListOptions,
  ): Promise<Paginated<Artifact>>;
  abstract deleteThreadLinksNotOwnedBy(
    threadId: UUID,
    owner: ArtifactOwner,
  ): Promise<void>;
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
