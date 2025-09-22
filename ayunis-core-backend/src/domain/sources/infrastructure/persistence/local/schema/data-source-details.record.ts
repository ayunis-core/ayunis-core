import {
  ChildEntity,
  Column,
  Entity,
  OneToOne,
  TableInheritance,
  JoinColumn,
} from 'typeorm';
import { DataType } from '../../../../domain/source-type.enum';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { DataSourceRecord } from './source.record';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'dataType' } })
export abstract class DataSourceDetailsRecord extends BaseRecord {
  @OneToOne(() => DataSourceRecord, { onDelete: 'CASCADE', cascade: true })
  @JoinColumn({ name: 'sourceId' })
  source: DataSourceRecord;

  @Column()
  dataType: DataType;
}

@Entity()
@ChildEntity(DataType.CSV)
export class CSVDataSourceDetailsRecord extends DataSourceDetailsRecord {
  @Column()
  data: string;
}
