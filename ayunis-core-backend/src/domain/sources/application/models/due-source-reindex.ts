import type { UUID } from 'crypto';
import type {
  DataType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';

/** The source's most specific type, which selects its re-index handler. */
export type SourceSubtype = TextType | DataType;

/** A scheduled source the scheduler claimed for a run. */
export interface DueSourceReindex {
  sourceId: UUID;
  /** Org of the source's knowledge base, whose models and crawl grants the run uses. */
  orgId: UUID;
  subtype: SourceSubtype;
  /** When the run was due, for handing the claim back if starting it fails. */
  dueAt: Date;
  /** The next due date the claim set; a hand-back applies only while it stands. */
  nextDueAt: Date;
}
