import type { UUID } from 'crypto';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';

export class PrepareContentEmbeddingsCommand {
  orgId: UUID;
  contents: string[];
  type: IndexType;

  constructor(params: { orgId: UUID; contents: string[]; type: IndexType }) {
    this.orgId = params.orgId;
    this.contents = params.contents;
    this.type = params.type;
  }
}
