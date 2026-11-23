import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
  Unique,
} from 'typeorm';
import type { UUID } from 'crypto';
import { OparlBodyObjectBase } from './oparl-body-object-base.record';
import { OparlFileRecord } from './oparl-file.record';

@Entity({ name: 'oparl_papers' })
@Unique(['systemId', 'oparlId'])
@Index(['bodyId', 'date'])
export class OparlPaperRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  reference: string | null;

  @Column({ type: 'date', nullable: true })
  date: string | null;

  @Column({ type: 'text', nullable: true })
  paperType: string | null;

  @Column({ type: 'text', nullable: true })
  mainFileOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  mainFileId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mainFileId' })
  mainFile: Relation<OparlFileRecord> | null;
}
