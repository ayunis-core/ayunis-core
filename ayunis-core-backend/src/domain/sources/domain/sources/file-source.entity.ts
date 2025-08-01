import { UUID } from 'crypto';
import { Source } from '../source.entity';
import { SourceType } from '../source-type.enum';
import { SourceContent } from '../source-content.entity';

export class FileSource extends Source {
  fileType: string;
  fileSize: number;
  fileName: string;

  constructor(params: {
    id?: UUID;
    fileType: string;
    fileSize: number;
    fileName: string;
    content: SourceContent[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      id: params.id,
      type: SourceType.FILE,
      content: params.content,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
    this.fileType = params.fileType;
    this.fileSize = params.fileSize;
    this.fileName = params.fileName;
  }
}
