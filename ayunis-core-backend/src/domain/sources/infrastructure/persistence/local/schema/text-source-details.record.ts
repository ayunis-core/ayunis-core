import {
  ChildEntity,
  Column,
  Entity,
  OneToMany,
  TableInheritance,
  OneToOne,
} from 'typeorm';
import { FileType, TextType } from '../../../../domain/source-type.enum';
import { SourceContentChunkRecord } from './source-content.record';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { TextSourceRecord } from './source.record';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'textType' } })
export abstract class TextSourceDetailsRecord extends BaseRecord {
  @OneToOne(() => TextSourceRecord, { onDelete: 'CASCADE', cascade: true })
  source: TextSourceRecord;

  @Column()
  textType: TextType;

  @Column()
  text: string;

  @OneToMany(() => SourceContentChunkRecord, (content) => content.source, {
    cascade: true,
    eager: true,
  })
  contentChunks: SourceContentChunkRecord[];
}

@Entity()
@ChildEntity(TextType.FILE)
export class FileSourceDetailsRecord extends TextSourceDetailsRecord {
  @Column()
  fileType: FileType;
}

@Entity()
@ChildEntity(TextType.WEB)
export class UrlSourceDetailsRecord extends TextSourceDetailsRecord {
  @Column()
  url: string;
}
