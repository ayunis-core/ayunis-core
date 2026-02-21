import {
  ChildEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { SourceType } from '../../../../domain/source-type.enum';
import { SourceCreator } from '../../../../domain/source-creator.enum';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { DataSourceDetailsRecord } from './data-source-details.record';
import { KnowledgeBaseRecord } from '../../../../../knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

@Entity('sources')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class SourceRecord extends BaseRecord {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: SourceCreator,
    default: SourceCreator.USER,
  })
  createdBy: SourceCreator;

  @Column({ nullable: true })
  knowledgeBaseId: UUID | null;

  @ManyToOne(() => KnowledgeBaseRecord, (kb) => kb.sources, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord | null;
}

@ChildEntity(SourceType.TEXT)
export class TextSourceRecord extends SourceRecord {
  @OneToOne(() => TextSourceDetailsRecord, (details) => details.source, {
    cascade: true,
    eager: true,
  })
  textSourceDetails: TextSourceDetailsRecord;
}

@ChildEntity(SourceType.DATA)
export class DataSourceRecord extends SourceRecord {
  @OneToOne(() => DataSourceDetailsRecord, (details) => details.source, {
    cascade: true,
    eager: true,
  })
  dataSourceDetails: DataSourceDetailsRecord;
}
