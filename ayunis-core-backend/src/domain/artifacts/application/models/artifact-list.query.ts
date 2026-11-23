import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import {
  ARTIFACT_DEFAULT_LIST_LIMIT,
  ARTIFACT_MAX_LIST_LIMIT,
} from 'src/domain/artifacts/domain/artifacts.constants';
import type { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

export interface ArtifactListParams {
  search?: string;
  type?: ArtifactType;
  limit?: number;
  offset?: number;
}

/** A page of one owner's artifacts, optionally searched by title and typed. */
export abstract class ArtifactListQuery extends PaginatedQuery {
  readonly search?: string;
  readonly type?: ArtifactType;

  constructor(params: ArtifactListParams) {
    super({
      limit: Math.min(
        params.limit ?? ARTIFACT_DEFAULT_LIST_LIMIT,
        ARTIFACT_MAX_LIST_LIMIT,
      ),
      offset: params.offset ?? 0,
    });
    this.search = params.search?.trim() || undefined;
    this.type = params.type;
  }
}
