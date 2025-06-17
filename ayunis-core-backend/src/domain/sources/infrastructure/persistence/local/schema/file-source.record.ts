import { Column, ChildEntity } from 'typeorm';
import { SourceRecord } from './source.record';
import { SourceType } from '../../../../domain/source-type.enum';

@ChildEntity(SourceType.FILE)
export class FileSourceRecord extends SourceRecord {
  @Column()
  fileType: string;

  @Column()
  fileSize: number;

  @Column()
  fileName: string;
}
