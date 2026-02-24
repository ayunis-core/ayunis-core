import type { UUID } from 'crypto';
import { Source } from '../source.entity';
import { DataType, SourceType } from '../source-type.enum';
import type { SourceCreator } from '../source-creator.enum';

export abstract class DataSource extends Source {
  dataType: DataType;
  abstract data: object;

  constructor(params: {
    id?: UUID;
    name: string;
    type: DataType;
    knowledgeBaseId?: UUID | null;
    createdBy?: SourceCreator;
  }) {
    super({ ...params, type: SourceType.DATA });
    this.dataType = params.type;
  }
}

export class CSVDataSource extends DataSource {
  data: {
    headers: string[];
    rows: string[][];
  };

  constructor(params: {
    id?: UUID;
    name: string;
    data: { headers: string[]; rows: string[][] };
    knowledgeBaseId?: UUID | null;
    createdBy?: SourceCreator;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: DataType.CSV, createdBy: params.createdBy });
    this.data = params.data;
  }
}
