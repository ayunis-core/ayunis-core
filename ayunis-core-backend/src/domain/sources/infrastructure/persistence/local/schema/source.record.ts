import {
  ChildEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { SourceType } from '../../../../domain/source-type.enum';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { DataSourceDetailsRecord } from './data-source-details.record';

@Entity('sources')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class SourceRecord extends BaseRecord {
  @Column()
  name: string;

  @Column()
  type: SourceType;
}

@Entity()
@ChildEntity(SourceType.TEXT)
export class TextSourceRecord extends SourceRecord {
  @OneToOne(() => TextSourceDetailsRecord, {
    onDelete: 'CASCADE',
    cascade: true,
    eager: true,
  })
  @JoinColumn({ name: 'sourceId' })
  textSourceDetails: TextSourceDetailsRecord;
}

@Entity()
@ChildEntity(SourceType.DATA)
export class DataSourceRecord extends SourceRecord {
  @OneToOne(() => DataSourceDetailsRecord, {
    onDelete: 'CASCADE',
    cascade: true,
    eager: true,
  })
  @JoinColumn({ name: 'sourceId' })
  dataSourceDetails: DataSourceDetailsRecord;
}
