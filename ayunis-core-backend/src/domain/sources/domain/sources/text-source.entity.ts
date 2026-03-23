import type { UUID } from 'crypto';
import { Source } from '../source.entity';
import type { FileType } from '../source-type.enum';
import { SourceType, TextType } from '../source-type.enum';
import type { SourceCreator } from '../source-creator.enum';

export abstract class TextSource extends Source {
  textType: TextType;

  constructor(params: {
    id?: UUID;
    name: string;
    type: TextType;
    knowledgeBaseId?: UUID | null;
    createdBy?: SourceCreator;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: SourceType.TEXT });
    this.textType = params.type;
  }
}

export class FileSource extends TextSource {
  fileType: FileType;

  constructor(params: {
    id?: UUID;
    fileType: FileType;
    name: string;
    type: TextType;
    knowledgeBaseId?: UUID | null;
    createdBy?: SourceCreator;
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
    name: string;
    type: TextType;
    knowledgeBaseId?: UUID | null;
    createdBy?: SourceCreator;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: TextType.WEB });
    this.url = params.url;
  }
}
