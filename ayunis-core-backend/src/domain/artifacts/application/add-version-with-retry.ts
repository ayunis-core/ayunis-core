import type { Logger } from '@nestjs/common';
import type { ArtifactsRepository } from './ports/artifacts-repository.port';
import type { ArtifactVersion } from '../domain/artifact-version.entity';
import { ArtifactVersionConflictError } from './artifacts.errors';

const MAX_VERSION_RETRIES = 3;

/**
 * Builds a new ArtifactVersion and saves it with optimistic-concurrency retry.
 *
 * @param buildVersion - Called on each attempt with the current attempt number.
 *   Must return the version to persist (re-reads artifact state on retry).
 */
export async function addVersionWithRetry(params: {
  repository: ArtifactsRepository;
  logger: Logger;
  artifactId: string;
  buildVersion: () => Promise<ArtifactVersion>;
}): Promise<ArtifactVersion> {
  const { repository, logger, artifactId } = params;

  for (let attempt = 1; attempt <= MAX_VERSION_RETRIES; attempt++) {
    const version = await params.buildVersion();

    try {
      return await repository.addVersionAndUpdateCurrent(version);
    } catch (error) {
      if (
        error instanceof ArtifactVersionConflictError &&
        attempt < MAX_VERSION_RETRIES
      ) {
        logger.warn(`Version conflict on attempt ${attempt}, retrying`, {
          artifactId,
          versionNumber: version.versionNumber,
        });
        continue;
      }

      throw error;
    }
  }

  throw new ArtifactVersionConflictError(artifactId);
}
