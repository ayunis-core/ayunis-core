import { Column, Entity, TableInheritance, OneToMany } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { SourceType } from '../../../../domain/source-type.enum';
import { SourceContentRecord } from './source-content.record';

@Entity({ name: 'sources' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class SourceRecord extends BaseRecord {
  @Column({
    type: 'enum',
    enum: SourceType,
  })
  type: SourceType;

  @OneToMany(() => SourceContentRecord, (content) => content.source, {
    cascade: true,
  })
  content: SourceContentRecord[];
}
