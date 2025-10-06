import {
  ChildEntity,
  Column,
  Entity,
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

  @Column({ default: false })
  createdByLLM: boolean;
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
