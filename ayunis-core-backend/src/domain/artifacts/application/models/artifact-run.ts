import type { UUID } from 'crypto';
import type { ArtifactLookupOptions } from 'src/domain/artifacts/application/ports/artifacts-repository.port';

/**
 * The model run an artifact is read or written from. A run only finds
 * artifacts linked to its chat whose mode matches its own (anonymous runs
 * anonymous artifacts, normal runs normal ones), and in an anonymous run the
 * content it reads and writes carries the chat's placeholders.
 */
export interface ArtifactRun {
  readonly threadId: UUID;
  readonly isAnonymous: boolean;
}

export function runLookup(run?: ArtifactRun): ArtifactLookupOptions {
  return run
    ? { linkedThreadId: run.threadId, isAnonymous: run.isAnonymous }
    : {};
}
