import type { UUID } from 'crypto';
import type { IndexType } from './value-objects/index-type.enum';

/**
 * Index entries for one document that are fully computed (split and
 * embedded) but not yet persisted. Each indexer returns its own subclass, and
 * only that indexer can store it.
 */
export abstract class PreparedIndexContent {
  constructor(
    public readonly type: IndexType,
    public readonly documentId: UUID,
  ) {}
}
