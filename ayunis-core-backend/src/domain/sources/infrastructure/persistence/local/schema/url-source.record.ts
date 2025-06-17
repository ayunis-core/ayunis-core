import { Column, ChildEntity } from 'typeorm';
import { SourceRecord } from './source.record';
import { SourceType } from '../../../../domain/source-type.enum';

@ChildEntity(SourceType.URL)
export class UrlSourceRecord extends SourceRecord {
  @Column()
  url: string;
}
