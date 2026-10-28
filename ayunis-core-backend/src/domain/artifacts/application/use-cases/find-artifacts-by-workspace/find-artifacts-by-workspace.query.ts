import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import {
  ARTIFACT_DEFAULT_LIST_LIMIT,
  ARTIFACT_MAX_LIST_LIMIT,
} from 'src/domain/artifacts/domain/artifacts.constants';
import type { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

export class FindArtifactsByWorkspaceQuery extends PaginatedQuery {
  readonly workspaceId: UUID;
  readonly search?: string;
  readonly type?: ArtifactType;

  constructor(params: {
    workspaceId: UUID;
    search?: string;
    type?: ArtifactType;
    limit?: number;
    offset?: number;
  }) {
    super({
      limit: Math.min(
        params.limit ?? ARTIFACT_DEFAULT_LIST_LIMIT,
        ARTIFACT_MAX_LIST_LIMIT,
      ),
      offset: params.offset ?? 0,
    });
    this.workspaceId = params.workspaceId;
    this.search = params.search?.trim() || undefined;
    this.type = params.type;
  }
}
