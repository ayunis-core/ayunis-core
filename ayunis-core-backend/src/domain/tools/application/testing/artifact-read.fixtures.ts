import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import type { ArtifactInRun } from 'src/domain/artifacts/application/use-cases/read-artifact-in-run/read-artifact-in-run.use-case';

/** What `ReadArtifactInRunUseCase` returns for a normal artifact. */
export function readInRun(artifact: Artifact): ArtifactInRun {
  const current = artifact.versions.find(
    (version) => version.versionNumber === artifact.currentVersionNumber,
  );
  return {
    artifact,
    title: artifact.title,
    content: current?.content ?? '',
    threadPiiMasks: null,
  };
}
