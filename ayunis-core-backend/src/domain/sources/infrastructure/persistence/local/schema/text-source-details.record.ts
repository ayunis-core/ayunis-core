import {
  ChildEntity,
  Column,
  Entity,
  OneToMany,
  TableInheritance,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { FileType, TextType } from '../../../../domain/source-type.enum';
import { SourceContentChunkRecord } from './source-content-chunk.record';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { TextSourceRecord } from './source.record';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'textType' } })
export abstract class TextSourceDetailsRecord extends BaseRecord {
  @OneToOne(() => TextSourceRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  source: TextSourceRecord;

  @Column()
  text: string;

  @OneToMany(() => SourceContentChunkRecord, (content) => content.source, {
    cascade: true,
    eager: true,
  })
  contentChunks: SourceContentChunkRecord[];
}

@ChildEntity(TextType.FILE)
export class FileSourceDetailsRecord extends TextSourceDetailsRecord {
  @Column()
  fileType: FileType;
}

@ChildEntity(TextType.WEB)
export class UrlSourceDetailsRecord extends TextSourceDetailsRecord {
  @Column()
  url: string;
}
