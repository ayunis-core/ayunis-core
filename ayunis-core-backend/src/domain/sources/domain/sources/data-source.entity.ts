import { UUID } from 'crypto';
import { Source } from '../source.entity';
import { DataType, SourceType } from '../source-type.enum';

export abstract class DataSource extends Source {
  dataType: DataType;
  abstract data: object;

  constructor(params: {
    id?: UUID;
    name: string;
    type: DataType;
    createdByLLM?: boolean;
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
    createdByLLM?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: DataType.CSV });
    this.data = params.data;
  }
}
