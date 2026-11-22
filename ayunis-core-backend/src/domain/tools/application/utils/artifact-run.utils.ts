import type { ArtifactRun } from 'src/domain/artifacts/application/models/artifact-run';
import type { ToolExecutionContext } from 'src/domain/tools/application/ports/execution.handler';

export function artifactRunOf(context: ToolExecutionContext): ArtifactRun {
  return {
    threadId: context.threadId,
    isAnonymous: context.isAnonymous ?? false,
  };
}
