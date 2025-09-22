import { UUID } from 'crypto';
import { Source } from '../source.entity';
import { FileType, SourceType, TextType } from '../source-type.enum';
import { TextSourceContentChunk } from '../source-content.entity';

export abstract class TextSource extends Source {
  contentChunks: TextSourceContentChunk[];
  textType: TextType;
  text: string;

  constructor(params: {
    id?: UUID;
    name: string;
    type: TextType;
    text: string;
    contentChunks: TextSourceContentChunk[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: SourceType.TEXT });
    this.text = params.text;
    this.textType = params.type;
    this.contentChunks = params.contentChunks;
  }
}

export class FileSource extends TextSource {
  fileType: FileType;

  constructor(params: {
    id?: UUID;
    fileType: FileType;
    name: string;
    type: TextType;
    text: string;
    contentChunks: TextSourceContentChunk[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: TextType.FILE });
    this.fileType = params.fileType;
  }
}

export class UrlSource extends TextSource {
  url: string;

  constructor(params: {
    id?: UUID;
    url: string;
    contentChunks: TextSourceContentChunk[];
    text: string;
    name: string;
    type: TextType;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: TextType.WEB });
    this.url = params.url;
  }
}
