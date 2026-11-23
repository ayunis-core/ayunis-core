import type { UUID } from 'crypto';
import {
  ArtifactListQuery,
  type ArtifactListParams,
} from 'src/domain/artifacts/application/models/artifact-list.query';

export class FindArtifactsByWorkspaceQuery extends ArtifactListQuery {
  readonly workspaceId: UUID;

  constructor(params: ArtifactListParams & { workspaceId: UUID }) {
    super(params);
    this.workspaceId = params.workspaceId;
  }
}
