import {
  ChildEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { DataType } from '../../../../domain/source-type.enum';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { DataSourceRecord } from './source.record';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'dataType' } })
export abstract class DataSourceDetailsRecord extends BaseRecord {
  @OneToOne(() => DataSourceRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  source: DataSourceRecord;
}

@ChildEntity(DataType.CSV)
export class CSVDataSourceDetailsRecord extends DataSourceDetailsRecord {
  @Column({ type: 'jsonb' })
  data: { headers: string[]; rows: string[][] };
}
