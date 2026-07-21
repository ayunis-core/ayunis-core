import type { DataSourceFileKind } from '../../../domain/data-source-file-kind.type';

export class StartDataSourceProcessingCommand {
  readonly fileData: Buffer;
  readonly fileName: string;
  readonly kind: DataSourceFileKind;
  /**
   * Called with the number of sources this file will create (one per data
   * sheet) before any of them exist. Only the parse can determine that count,
   * but only the caller knows its capacity rule — the callback lets it reject
   * an oversized workbook while rejection is still free, throwing its own
   * module's limit error.
   */
  readonly ensureCapacityFor?: (sourceCount: number) => void;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    kind: DataSourceFileKind;
    ensureCapacityFor?: (sourceCount: number) => void;
  }) {
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.kind = params.kind;
    this.ensureCapacityFor = params.ensureCapacityFor;
  }
}
