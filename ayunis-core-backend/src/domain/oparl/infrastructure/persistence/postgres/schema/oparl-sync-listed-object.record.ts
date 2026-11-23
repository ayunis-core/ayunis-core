import type { UUID } from 'crypto';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import type { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import { OparlSyncRunRecord } from './oparl-sync-run.record';

/** What a full listing contained so far; removed when the run ends. */
@Entity({ name: 'oparl_sync_listed_objects' })
export class OparlSyncListedObjectRecord {
  @PrimaryColumn({ type: 'uuid' })
  runId: UUID;

  @ManyToOne(() => OparlSyncRunRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' })
  run: Relation<OparlSyncRunRecord>;

  @PrimaryColumn({ type: 'text' })
  entityType: OparlEntityType;

  @PrimaryColumn({ type: 'text' })
  oparlId: string;
}
