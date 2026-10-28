import type { UUID } from 'crypto';
import { Source } from 'src/domain/sources/domain/source.entity';
import {
  DataType,
  SourceType,
} from 'src/domain/sources/domain/source-type.enum';
import type { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import type { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';

export abstract class DataSource extends Source {
  dataType: DataType;
  abstract data: object;

  constructor(params: {
    id?: UUID;
    name: string;
    type: DataType;
    knowledgeBaseId?: UUID | null;
    status?: SourceStatus;
    processingError?: string | null;
    processingErrorCode?: SourceProcessingErrorCode | null;
    processingStartedAt?: Date | null;
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
    status?: SourceStatus;
    processingError?: string | null;
    processingErrorCode?: SourceProcessingErrorCode | null;
    processingStartedAt?: Date | null;
    createdBy?: SourceCreator;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, type: DataType.CSV, createdBy: params.createdBy });
    this.data = params.data;
  }
}
